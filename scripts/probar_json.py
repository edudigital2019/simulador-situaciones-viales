"""NIVEL 2 · Salida en JSON validada con esquema, a través del servicio con reintentos y respaldo.

    python scripts/probar_json.py "La impresora del segundo piso imprime hojas en blanco"
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas import Clasificacion, calcular_prioridad  # noqa: E402
from app.services.llm import ClienteLLM, ErrorLLM, cargar_prompt  # noqa: E402

texto = " ".join(sys.argv[1:]) or "Desde las 8 nadie en ventas puede entrar al sistema de facturación."
try:
    r = ClienteLLM().generar_json(cargar_prompt("system_v3"), texto, Clasificacion)
except ErrorLLM as e:
    sys.exit(f"✗ {e.mensaje_usuario}")
print(r.datos.model_dump_json(indent=2))
print(f"Prioridad (la calcula el código): {calcular_prioridad(r.datos)}")
print(f"Proveedor: {r.proveedor} · {r.modelo} · {r.latencia_ms} ms · tokens {r.tokens_entrada}+{r.tokens_salida} · intentos {r.intentos}")
