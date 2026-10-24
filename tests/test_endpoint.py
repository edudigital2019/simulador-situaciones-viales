"""Pruebas del endpoint con el servicio de IA reemplazado por un doble."""
from fastapi.testclient import TestClient

from app.main import app, obtener_llm
from app.schemas import Clasificacion
from app.services.llm import ProveedorNoDisponible, Resultado, SalidaInvalida


class LLMFalso:
    def __init__(self, resultado=None, error=None):
        self.resultado, self.error = resultado, error

    def generar_json(self, system, usuario, esquema):
        if self.error:
            raise self.error
        return self.resultado


def con(llm):
    app.dependency_overrides[obtener_llm] = lambda: llm
    return TestClient(app)


def clasif(**kw):
    base = dict(es_soporte_tecnologico=True, categoria="accesos", impacto="alto", urgencia="alta",
                resumen="Ventas sin acceso a facturación.", datos_faltantes=[])
    return Resultado(Clasificacion(**{**base, **kw}), "a", "m", 10, 5, 100, 1)


def test_health():
    assert con(LLMFalso()).get("/health").json() == {"estado": "ok"}


def test_prioridad_la_calcula_el_codigo():
    r = con(LLMFalso(clasif())).post("/clasificar", json={"texto": "Nadie en ventas entra al sistema"})
    assert r.status_code == 200 and r.json()["prioridad"] == "P1"


def test_fuera_de_dominio_no_tiene_prioridad():
    r = con(LLMFalso(clasif(es_soporte_tecnologico=False, categoria="otro"))).post("/clasificar", json={"texto": "¿Mis vacaciones?"})
    assert r.json()["prioridad"] is None and "Talento Humano" in r.json()["mensaje"]


def test_proveedor_caido_da_503_con_mensaje_claro():
    r = con(LLMFalso(error=ProveedorNoDisponible())).post("/clasificar", json={"texto": "La impresora no imprime"})
    assert r.status_code == 503 and "no está disponible" in r.json()["detail"]


def test_salida_invalida_va_a_revision_humana():
    r = con(LLMFalso(error=SalidaInvalida())).post("/clasificar", json={"texto": "La impresora no imprime"})
    assert r.json()["requiere_revision_humana"] is True


def test_entrada_demasiado_larga_se_rechaza_antes_del_modelo():
    r = con(LLMFalso(clasif())).post("/clasificar", json={"texto": "x" * 5000})
    assert r.status_code == 422
