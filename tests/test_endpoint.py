import json as _json

import pytest

from app.main import (
    Problema,
    _problema,
    app,
    chat_normativo,
    confirmar_accion_chat,
    crear_escenario,
    descartar_accion_chat,
    evaluar,
    health,
    obtener_llm,
    progreso,
)
from app.schemas import EscenarioVialSchema, OpcionEscenario, SolicitudChat, SolicitudEscenario, SolicitudEvaluacion
from app.services.llm import ProveedorNoDisponible, Resultado
from app.tools.progreso import registrar_progreso


class LLMFalso:
    def __init__(self, resultado=None, error=None):
        self.resultado, self.error = resultado, error

    def generar_json(self, system, usuario, esquema):
        if self.error:
            raise self.error
        return self.resultado


class _RespSimple:
    def __init__(self, status_code: int, payload: dict, headers: dict | None = None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}

    def json(self):
        return self._payload


class ClienteDirecto:
    def __init__(self, llm):
        self.llm = llm

    def get(self, ruta: str, headers: dict | None = None):
        if ruta == "/health":
            return _RespSimple(200, health())
        if ruta == "/progreso":
            sesion = (headers or {}).get("X-Session-ID", "ip:127.0.0.1").lower()
            return _RespSimple(200, progreso(sesion=sesion).model_dump())
        raise ValueError(f"Ruta no soportada: {ruta}")

    def post(self, ruta: str, json: dict, headers: dict | None = None):
        sesion = (headers or {}).get("X-Session-ID", "ip:127.0.0.1").lower()
        try:
            if ruta == "/escenarios":
                res = crear_escenario(SolicitudEscenario(**json), sesion=sesion, llm=self.llm)
                return _RespSimple(200, res.model_dump())
            if ruta == "/evaluaciones":
                res = evaluar(SolicitudEvaluacion(**json), sesion=sesion)
                return _RespSimple(200, res.model_dump())
        except Problema as p:
            resp = _problema(p.estado, p.titulo, p.detalle, p.tipo, p.cabeceras)
            return _RespSimple(p.estado, _json.loads(resp.body.decode("utf-8")), dict(resp.headers))
        raise ValueError(f"Ruta no soportada: {ruta}")


def con(llm):
    app.dependency_overrides[obtener_llm] = lambda: llm
    return ClienteDirecto(llm)


def mock_escenario(**kw):
    opciones = [
        OpcionEscenario(id_opcion="A", texto="Acelerar y pasar con semáforo en verde ignorando al agente", es_correcta=False),
        OpcionEscenario(id_opcion="B", texto="Detener la marcha y obedecer la señal manual del agente de tránsito", es_correcta=True),
        OpcionEscenario(id_opcion="C", texto="Girar a la derecha sin colocar la luz direccional para esquivarlo", es_correcta=False),
        OpcionEscenario(id_opcion="D", texto="Tocar la bocina insistentemente para exigir el paso prioritario", es_correcta=False),
    ]
    base = dict(
        id_escenario="ESC-PRUEBA-01",
        perfil="conductor_particular",
        nivel_dificultad="baja",
        situacion="Conduces en una avenida principal y un agente de tránsito te indica detenerte a pesar de tener semáforo verde.",
        opciones=opciones,
        respuesta_correcta="B",
        id_contravencion_asociada="CONT-COIP-ART389-1",
        articulo_norma="Art. 389 num. 1",
        explicacion_educativa="Las indicaciones del agente de tránsito tienen máxima prioridad sobre el semáforo y las señales luminosas fijas.",
    )
    return Resultado(EscenarioVialSchema(**{**base, **kw}), "a", "gemini-3.8-flash", 120, 80, 250, 1)


def test_health():
    respuesta = con(LLMFalso()).get("/health")
    datos = respuesta.json()

    assert respuesta.status_code == 200
    assert datos["status"] == "ok"
    assert {"indice_cargado", "fragmentos", "modelo_configurado", "version"} <= datos.keys()


def test_generar_escenario_oculta_respuesta_correcta():
    client = con(LLMFalso(mock_escenario()))
    headers = {"X-Session-ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    r = client.post("/escenarios", json={"perfil": "conductor_particular", "nivel_dificultad": "baja"}, headers=headers)
    assert r.status_code == 200
    datos = r.json()
    assert "id_escenario" in datos
    assert len(datos["opciones"]) == 4
    assert "respuesta_correcta" not in datos
    assert "id_contravencion_asociada" not in datos
    assert "explicacion_educativa" not in datos


def test_evaluar_respuesta_correcta_e_incorrecta():
    client = con(LLMFalso(mock_escenario()))
    headers = {"X-Session-ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    creado = client.post("/escenarios", json={"perfil": "conductor_particular", "nivel_dificultad": "baja"}, headers=headers).json()
    id_esc = creado["id_escenario"]

    r_eval = client.post("/evaluaciones", json={"id_escenario": id_esc, "respuesta": "A"}, headers=headers)
    assert r_eval.status_code == 200
    res = r_eval.json()
    assert res["es_correcta"] is False
    assert res["respuesta_correcta"] == "B"
    assert res["sancion"]["multa_usd"] == 144.60
    assert res["sancion"]["puntos_reducidos"] == 6.0
    assert res["sancion"]["puntos_aplicables"] == 0.0
    assert res["contravencion"]["articulo"] == "Art. 389 num. 1"


def test_evaluacion_no_permite_reusar_escenario():
    client = con(LLMFalso(mock_escenario()))
    headers = {"X-Session-ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    creado = client.post("/escenarios", json={"perfil": "conductor_particular", "nivel_dificultad": "baja"}, headers=headers).json()
    id_esc = creado["id_escenario"]

    r1 = client.post("/evaluaciones", json={"id_escenario": id_esc, "respuesta": "B"}, headers=headers)
    assert r1.status_code == 200
    assert r1.json()["es_correcta"] is True

    r2 = client.post("/evaluaciones", json={"id_escenario": id_esc, "respuesta": "B"}, headers=headers)
    assert r2.status_code == 404


def test_fuera_de_dominio_retorna_422_rfc9457():
    abstencion = mock_escenario(
        id_contravencion_asociada="FALTA",
        situacion="FALTA: Información fuera del dominio normativo vial de Ecuador",
        opciones=[],
    )
    client = con(LLMFalso(abstencion))
    headers = {"X-Session-ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    r = client.post(
        "/escenarios",
        json={"perfil": "conductor_particular", "nivel_dificultad": "baja", "tema": "receta de cocina"},
        headers=headers,
    )
    assert r.status_code == 422
    assert "fuera-de-dominio" in r.json()["type"]


def test_proveedor_caido_retorna_503_con_retry_after():
    client = con(LLMFalso(error=ProveedorNoDisponible()))
    headers = {"X-Session-ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    r = client.post("/escenarios", json={"perfil": "conductor_particular", "nivel_dificultad": "baja"}, headers=headers)
    assert r.status_code == 503
    assert "retry-after" in {k.lower() for k in r.headers}


def test_evaluacion_registra_progreso_usuario():
    client = con(LLMFalso(mock_escenario()))
    headers = {"X-Session-ID": "progreso-test-user-01"}
    creado = client.post("/escenarios", json={"perfil": "conductor_particular", "nivel_dificultad": "baja"}, headers=headers).json()
    r_eval = client.post("/evaluaciones", json={"id_escenario": creado["id_escenario"], "respuesta": "B"}, headers=headers).json()
    assert r_eval["progreso"]["aciertos"] >= 1
    assert r_eval["herramientas_ejecutadas"] == ["registrar_progreso"]
    prog = client.get("/progreso", headers=headers).json()
    assert prog["total_evaluados"] >= 1 and prog["aciertos"] >= 1


def test_tool_registrar_progreso_se_ejecuta_una_sola_vez_por_evaluacion():
    sesion = "tool-progreso-unico-test-01"
    client = con(LLMFalso(mock_escenario()))
    headers = {"X-Session-ID": sesion}
    creado = client.post(
        "/escenarios",
        json={"perfil": "conductor_particular", "nivel_dificultad": "baja"},
        headers=headers,
    ).json()

    evaluacion = client.post(
        "/evaluaciones",
        json={"id_escenario": creado["id_escenario"], "respuesta": "B"},
        headers=headers,
    ).json()

    assert evaluacion["herramientas_ejecutadas"] == ["registrar_progreso"]
    assert evaluacion["progreso"]["total_evaluados"] == 1
    assert client.get("/progreso", headers=headers).json()["total_evaluados"] == 1


def test_siguiente_escenario_aplica_dificultad_sugerida_por_progreso():
    sesion = "dificultad-adaptativa-test-01"
    registrar_progreso(sesion, True)
    progreso_adaptado = registrar_progreso(sesion, True)
    assert progreso_adaptado.dificultad_sugerida == "media"

    client = con(LLMFalso(mock_escenario(nivel_dificultad="media")))
    respuesta = client.post(
        "/escenarios",
        json={"perfil": "conductor_particular", "nivel_dificultad": "baja"},
        headers={"X-Session-ID": sesion},
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["nivel_solicitado"] == "baja"
    assert datos["nivel_dificultad"] == "media"
    assert datos["dificultad_aplicada_por_progreso"] is True


def test_chat_aplica_limite_de_tasa_y_retry_after(monkeypatch):
    class LimitadorAgotado:
        def consumir(self, clave):
            assert clave == "sesion-chat-prueba"
            return 12.0

    monkeypatch.setattr("app.main.limitador_chat", LimitadorAgotado())

    with pytest.raises(Problema) as capturado:
        chat_normativo(
            SolicitudChat(pregunta="¿Qué sanción aplica por cruzar el semáforo en rojo?"),
            sesion="sesion-chat-prueba",
            llm=object(),
        )

    assert capturado.value.estado == 429
    assert capturado.value.cabeceras == {"Retry-After": "12"}


def _respuesta_chat_con_sancion():
    return {
        "pregunta": "¿Cuál es la sanción?",
        "abstencion": False,
        "tipo": "con_fuente",
        "respuesta": "Aplica el Art. 389.",
        "sancion_calculada": {"articulo": "Art. 389", "multa_usd": 144.60},
    }


def test_confirmacion_humana_no_ejecuta_antes_de_aprobar_y_es_idempotente(monkeypatch):
    sesion = "confirmacion-real-test-01"
    monkeypatch.setattr("app.main.ejecutar_agente_consulta", lambda *args, **kwargs: _respuesta_chat_con_sancion())

    antes = progreso(sesion=sesion)
    respuesta = chat_normativo(SolicitudChat(pregunta="¿Cuál es la sanción?"), sesion=sesion, llm=object())
    accion = respuesta["accion_pendiente"]

    assert accion["estado"] == "pendiente"
    assert progreso(sesion=sesion).consultas_confirmadas == antes.consultas_confirmadas == 0

    primera = confirmar_accion_chat(accion["id_accion"], sesion=sesion)
    segunda = confirmar_accion_chat(accion["id_accion"], sesion=sesion)

    assert primera["estado"] == segunda["estado"] == "confirmada"
    assert primera["progreso"]["consultas_confirmadas"] == 1
    assert progreso(sesion=sesion).consultas_confirmadas == 1
    assert progreso(sesion=sesion).total_evaluados == 0


def test_descartar_accion_no_modifica_progreso_y_aisla_sesiones(monkeypatch):
    sesion = "confirmacion-real-test-02"
    monkeypatch.setattr("app.main.ejecutar_agente_consulta", lambda *args, **kwargs: _respuesta_chat_con_sancion())
    respuesta = chat_normativo(SolicitudChat(pregunta="¿Cuál es la sanción?"), sesion=sesion, llm=object())
    accion_id = respuesta["accion_pendiente"]["id_accion"]

    with pytest.raises(Problema) as ajena:
        confirmar_accion_chat(accion_id, sesion="otra-sesion")
    assert ajena.value.estado == 404

    descartada = descartar_accion_chat(accion_id, sesion=sesion)
    confirmacion_tardia = confirmar_accion_chat(accion_id, sesion=sesion)

    assert descartada["estado"] == confirmacion_tardia["estado"] == "descartada"
    assert progreso(sesion=sesion).consultas_confirmadas == 0
