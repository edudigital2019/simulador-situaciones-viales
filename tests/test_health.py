from fastapi.testclient import TestClient
from app.main import app


def test_health_responde_ok():
    with TestClient(app) as client:
        respuesta = client.get("/health")

    assert respuesta.status_code == 200
    assert respuesta.json()["status"] == "ok"