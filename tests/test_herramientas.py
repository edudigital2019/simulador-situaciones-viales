import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.parametros import cargar_parametros
from app.schemas import Contravencion, EscenarioVialSchema
from app.tools.calcular_sancion import calcular_multa, calcular_sancion
from app.tools.contravenciones import (
    EscenarioInvalido,
    FueraDeDominio,
    candidatas,
    cargar_tabla,
    validar_escenario,
)
from app.tools.evaluar_respuesta import evaluar_respuesta

PARAMS = {"sbu_usd": 460.00, "sbu_fuente": "prueba", "aviso_educativo": "Material educativo."}
CUARTA = Contravencion(
    id_contravencion="CONT-PRUEBA-1",
    clase="Cuarta Clase",
    articulo="Art. 389 num. 1",
    norma="Código Orgánico Integral Penal",
    descripcion_infraccion="Desobedecer al agente.",
    porcentaje_sbu=30.0,
    puntos_reducidos=6.0,
    perfiles_aplicables=["conductor_particular", "conductor_profesional"],
)
TABLA = {CUARTA.id_contravencion: CUARTA}


def escenario(**kw):
    base = dict(
        id_escenario="ESC-X",
        perfil="conductor_particular",
        nivel_dificultad="baja",
        situacion="Un agente de tránsito te ordena detenerte con el semáforo en verde.",
        opciones=[{"id_opcion": l, "texto": f"Opción de prueba {l}", "es_correcta": l == "B"} for l in "ABCD"],
        respuesta_correcta="B",
        id_contravencion_asociada="CONT-PRUEBA-1",
        articulo_norma="Art. 389 num. 1",
        explicacion_educativa="Las señales del agente prevalecen sobre el semáforo.",
    )
    return EscenarioVialSchema(**{**base, **kw})


def test_hu02_cuarta_clase_30_por_ciento_de_460_es_138():
    s = calcular_sancion(CUARTA, PARAMS)
    assert s.multa_usd == 138.00 and s.puntos_reducidos == 6.0 and s.sbu_usd == 460.00


@pytest.mark.parametrize("porcentaje,sbu,esperado", [
    (100, 460, "460.00"),
    (50, 460, "230.00"),
    (15, 460, "69.00"),
    (5, 470, "23.50"),
    (10, 482, "48.20"),
    (40, 460.0, "184.00"),
    (0, 460, "0.00"),
])
def test_multa_exacta_con_decimal(porcentaje, sbu, esperado):
    assert str(calcular_multa(porcentaje, sbu)) == esperado


@pytest.mark.parametrize("porcentaje,sbu", [(-1, 460), (101, 460), (30, 0), (30, -460)])
def test_multa_rechaza_valores_imposibles(porcentaje, sbu):
    with pytest.raises(ValueError):
        calcular_multa(porcentaje, sbu)


def test_cambiar_sbu_en_configuracion_cambia_la_multa(monkeypatch):
    monkeypatch.setattr(Path, "read_text", lambda self, encoding="utf-8": json.dumps({"sbu_usd": 500.0, "aviso_educativo": "x"}))
    assert calcular_sancion(CUARTA, cargar_parametros()).multa_usd == 150.00


def test_parametros_rechaza_sbu_invalido(monkeypatch):
    monkeypatch.setattr(Path, "read_text", lambda self, encoding="utf-8": json.dumps({"sbu_usd": "cuatrocientos"}))
    with pytest.raises(ValueError, match="sbu_usd"):
        cargar_parametros()


def test_tabla_real_carga_y_es_coherente():
    tabla = cargar_tabla()
    assert len(tabla) == 90
    for c in tabla.values():
        assert c.id_contravencion.startswith("CONT-") and c.articulo.startswith("Art.")
    for perfil in ("conductor_particular", "conductor_profesional", "motociclista", "ciclista", "peaton"):
        assert candidatas(perfil, tabla), f"no hay contravenciones para {perfil}"


def test_misma_clase_misma_sancion_en_la_tabla():
    porcentaje_por_clase = {}
    for c in cargar_tabla().values():
        porcentaje_por_clase.setdefault((c.norma, c.clase), set()).add(c.porcentaje_sbu)
        if set(c.perfiles_aplicables).issubset({"peaton", "ciclista"}):
            assert c.puntos_reducidos == 0.0
        elif c.clase == "Séptima Clase":
            assert c.puntos_reducidos == 1.5
            assert c.puntos_aplicables == 0.0
    assert all(len(v) == 1 for v in porcentaje_por_clase.values()), porcentaje_por_clase


def test_hu01_escenario_valido_devuelve_la_contravencion_canonica():
    assert validar_escenario(escenario(), "conductor_particular", "baja", TABLA) is CUARTA


def test_contravencion_inexistente_se_descarta():
    with pytest.raises(EscenarioInvalido, match="inexistente"):
        validar_escenario(escenario(id_contravencion_asociada="CONT-INVENTADA-99"), "conductor_particular", "baja", TABLA)


def test_contravencion_de_otro_perfil_se_descarta():
    with pytest.raises(EscenarioInvalido, match="perfil"):
        validar_escenario(escenario(perfil="peaton"), "peaton", "baja", TABLA)


def test_dificultad_distinta_a_la_pedida_se_descarta():
    with pytest.raises(EscenarioInvalido):
        validar_escenario(escenario(nivel_dificultad="alta"), "conductor_particular", "baja", TABLA)


def test_marca_falta_es_abstencion():
    esc = escenario(
        id_contravencion_asociada="FALTA",
        situacion="FALTA: Información fuera del dominio normativo vial de Ecuador",
        opciones=[],
    )
    with pytest.raises(FueraDeDominio):
        validar_escenario(esc, "conductor_particular", "baja", TABLA)


@pytest.mark.parametrize("cambio", [
    {"opciones": [{"id_opcion": l, "texto": f"Opción de prueba {l}", "es_correcta": l == "A"} for l in "ABC"]},
    {"respuesta_correcta": "C"},
    {"opciones": [{"id_opcion": l, "texto": f"Opción de prueba {l}", "es_correcta": True} for l in "ABCD"]},
    {"situacion": "corta"},
    {"campo_inventado": "x"},
])
def test_esquema_rechaza_escenarios_incoherentes(cambio):
    with pytest.raises(ValidationError):
        escenario(**cambio)


def test_respuesta_incorrecta_muestra_sancion_calculada():
    r = evaluar_respuesta(escenario(), CUARTA, "A", PARAMS)
    assert r.es_correcta is False and r.respuesta_correcta == "B"
    assert r.sancion.multa_usd == 138.00 and r.contravencion.articulo == "Art. 389 num. 1"


def test_respuesta_correcta():
    assert evaluar_respuesta(escenario(), CUARTA, "B", PARAMS).es_correcta is True


def test_ajustar_dificultad_segun_historial():
    from app.tools.progreso import ajustar_dificultad
    assert ajustar_dificultad([]) == "baja"
    assert ajustar_dificultad([True, True, True]) == "alta"
    assert ajustar_dificultad([False, True, True]) == "media"
    assert ajustar_dificultad([True, False, False]) == "baja"


def test_registrar_progreso_acumula_multas_y_puntos():
    from app.tools.progreso import registrar_progreso, reiniciar_progreso
    reiniciar_progreso("usr-test-1")
    p1 = registrar_progreso("usr-test-1", es_correcta=False, multa_usd=144.60, puntos_reducidos=6.0)
    assert p1.total_evaluados == 1 and p1.fallos == 1 and p1.multas_acumuladas_usd == 144.60 and p1.puntos_perdidos == 6.0
    p2 = registrar_progreso("usr-test-1", es_correcta=True)
    assert p2.total_evaluados == 2 and p2.aciertos == 1 and p2.multas_acumuladas_usd == 144.60
    reiniciar_progreso("usr-test-1")


def test_esquemas_pydantic_y_registro_herramientas_agente():
    from app.services.agente import (
        ESQUEMAS_HERRAMIENTAS_OPENAI,
        HERRAMIENTAS_PERMITIDAS,
        REGISTRO_HERRAMIENTAS,
        ArgsCalcularSancion,
        HerramientaNoPermitidaError,
        despachar_herramienta,
    )

    assert set(REGISTRO_HERRAMIENTAS.keys()) == set(HERRAMIENTAS_PERMITIDAS)
    assert len(ESQUEMAS_HERRAMIENTAS_OPENAI) == len(HERRAMIENTAS_PERMITIDAS)
    for t in ESQUEMAS_HERRAMIENTAS_OPENAI:
        assert t["type"] == "function"
        assert "parameters" in t["function"]

    res_calc = despachar_herramienta("calcular_sancion", {"id_contravencion": "C-389-01"})
    assert res_calc["multa_usd"] == 144.60
    assert res_calc["porcentaje_sbu"] == 30.0

    with pytest.raises(ValidationError):
        ArgsCalcularSancion(id_contravencion="C-389-01", campo_extra="invalido")

    with pytest.raises(HerramientaNoPermitidaError):
        despachar_herramienta("anular_boleta_ant", {"motivo": "borrar multa"})


def test_ciclo_completo_modelo_tool_calls_rol_tool_y_respuesta():
    from types import SimpleNamespace
    from app.services.agente import ejecutar_agente_consulta

    class ClienteLLMMockToolCalling:
        def __init__(self):
            self.llamadas = 0

        def llamar_con_herramientas(self, mensajes, tools, tool_choice="auto"):
            self.llamadas += 1
            ejecutadas = [m["name"] for m in mensajes if m["role"] == "tool"]
            if "buscar_normativa_rag" not in ejecutadas:
                tc = SimpleNamespace(
                    id="call_mock_rag_1",
                    function=SimpleNamespace(
                        name="buscar_normativa_rag",
                        arguments=json.dumps({
                            "consulta": "Me pasé un semáforo en rojo, ¿cuál es la sanción?",
                            "top_k": 5,
                        }),
                    ),
                )
                msg = SimpleNamespace(content=None, tool_calls=[tc])
                return msg, "mock", "modelo-mock", 10, 1

            if "identificar_contravencion_coip" not in ejecutadas:
                nombre = "identificar_contravencion_coip"
                argumentos = {"consulta": "Semáforo en rojo", "articulo_recuperado": "389"}
            elif "calcular_sancion" not in ejecutadas:
                nombre = "calcular_sancion"
                argumentos = {"id_contravencion": "C-389-01"}
            elif "verificar_cita_y_seguridad" not in ejecutadas:
                nombre = "verificar_cita_y_seguridad"
                argumentos = {"articulo": "389", "articulos_recuperados": ["389"]}
            else:
                msg_final = SimpleNamespace(
                    content="Respuesta sintetizada tras herramientas",
                    tool_calls=None,
                )
                return msg_final, "mock", "modelo-mock", 12, 1

            tc = SimpleNamespace(
                id=f"call_mock_{self.llamadas}",
                function=SimpleNamespace(name=nombre, arguments=json.dumps(argumentos)),
            )
            msg = SimpleNamespace(content=None, tool_calls=[tc])
            return msg, "mock", "modelo-mock", 10, 1

    mock_llm = ClienteLLMMockToolCalling()
    res = ejecutar_agente_consulta(
        "Me pasé un semáforo en rojo, ¿cuál es la sanción?",
        cliente_llm=mock_llm,
    )
    assert mock_llm.llamadas == 1
    assert "144.60 USD" in res["respuesta"]
    mensajes_traza = res["agente"]["mensajes"]
    assert any(m["role"] == "assistant" and m.get("tool_calls") for m in mensajes_traza)
    msgs_tool = [m for m in mensajes_traza if m["role"] == "tool"]
    assert len(msgs_tool) == 4
    assert msgs_tool[0]["tool_call_id"] == "call_mock_rag_1"
    assert msgs_tool[0]["name"] == "buscar_normativa_rag"


def test_agente_no_acepta_respuesta_directa_sin_consultar_herramientas():
    from types import SimpleNamespace
    from app.services.agente import ejecutar_agente_consulta

    class ClienteQueRespondeDirecto:
        def llamar_con_herramientas(self, mensajes, tools, tool_choice="auto"):
            return (
                SimpleNamespace(content="Respuesta sin consultar normativa", tool_calls=None),
                "mock",
                "modelo-mock",
                5,
                1,
            )

    res = ejecutar_agente_consulta(
        "¿Cuáles son los ingredientes para preparar fanesca?",
        cliente_llm=ClienteQueRespondeDirecto(),
    )

    assert res["abstencion"] is True
    assert "Solo puedo responder consultas relacionadas con normativa" in res["respuesta"]
    assert any(m.get("name") == "buscar_normativa_rag" for m in res["agente"]["mensajes"])


def test_agente_maneja_argumentos_invalidos_sin_error_interno():
    from types import SimpleNamespace
    from app.services.agente import ejecutar_agente_consulta

    class ClienteConArgumentosInvalidos:
        def __init__(self):
            self.primera = True

        def llamar_con_herramientas(self, mensajes, tools, tool_choice="auto"):
            if self.primera:
                self.primera = False
                llamada = SimpleNamespace(
                    id="call_invalida",
                    function=SimpleNamespace(name="buscar_normativa_rag", arguments="{}"),
                )
                return SimpleNamespace(content=None, tool_calls=[llamada]), "mock", "modelo-mock", 5, 1
            return SimpleNamespace(content="Respuesta directa", tool_calls=None), "mock", "modelo-mock", 5, 1

    res = ejecutar_agente_consulta(
        "¿Qué sanción aplica por cruzar un semáforo en rojo?",
        cliente_llm=ClienteConArgumentosInvalidos(),
    )

    assert res["tipo"] in {"con_fuente", "silencio"}
    assert res["respuesta"]
    assert any("Argumentos inválidos" in b["detalle"] for b in res["agente"]["bitacora"])

