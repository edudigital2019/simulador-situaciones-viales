"""Compara sus versiones de system prompt con las 10 entradas de eval/entradas_prompts.csv
y genera la tabla de docs/05-prompts.md (la que se revisa el viernes).

    python scripts/comparar_prompts.py                  # todas las versiones de app/prompts/
    python scripts/comparar_prompts.py system_v2 system_v3

El script llena las respuestas, los tokens y el tiempo. Las columnas ¿Correcta?, ¿Inventa?
y ¿Formato? las califica EL GRUPO leyendo cada respuesta: esa es la parte que se aprende.
La versión ganadora es la que MENOS inventa, no la que más escribe.
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from app.schemas import Clasificacion  # noqa: E402  ← cambie por el esquema de su caso
from app.services.llm import ClienteLLM, ErrorLLM, cargar_prompt  # noqa: E402

ESQUEMA = Clasificacion
versiones = sys.argv[1:] or sorted(p.stem for p in (RAIZ / "app/prompts").glob("system_v*.md"))
entradas = list(csv.DictReader(open(RAIZ / "eval/entradas_prompts.csv", encoding="utf-8")))
llm = ClienteLLM()
crudo, filas = {}, []

for v in versiones:
    system = cargar_prompt(v)
    for e in entradas:
        try:
            r = llm.generar_json(system, e["entrada"], ESQUEMA)
            salida = r.datos.model_dump()
            fila = {"version": v, "id": e["id"], "salida": salida, "tokens": (r.tokens_entrada or 0) + (r.tokens_salida or 0),
                    "ms": r.latencia_ms, "proveedor": r.proveedor}
        except ErrorLLM as err:
            fila = {"version": v, "id": e["id"], "salida": {"error": type(err).__name__}, "tokens": 0, "ms": 0, "proveedor": "-"}
        filas.append(fila)
        print(f"{v} · entrada {e['id']:>2} · {fila['ms']} ms")

(RAIZ / "docs").mkdir(exist_ok=True)
(RAIZ / "eval/resultados_prompts.json").write_text(json.dumps(filas, ensure_ascii=False, indent=2), encoding="utf-8")


def corto(s: dict) -> str:
    if "error" in s:
        return f"ERROR: {s['error']}"
    return "; ".join(f"{k}={v}" for k, v in s.items() if k in ("es_soporte_tecnologico", "categoria", "impacto", "urgencia"))


md = [f"# Comparación de versiones del system prompt\n",
      f"Fecha: {date.today():%d/%m/%Y} · Modelo: {llm.config.principal.modelo} · Respaldo: "
      f"{llm.config.respaldo.modelo if llm.config.respaldo else 'ninguno'}\n",
      "Califiquen cada respuesta con **Sí / No**. ¿Correcta? = clasifica bien. ¿Inventa? = afirma algo que no "
      "está en la solicitud. ¿Formato? = respeta el esquema, el tono y las restricciones (por ejemplo, no copia datos personales).\n"]
for v in versiones:
    md.append(f"\n## {v}\n\n| # | Tipo | Entrada | Respuesta del modelo | ¿Correcta? | ¿Inventa? | ¿Formato? |\n|---|---|---|---|---|---|---|")
    for e in entradas:
        f = next(x for x in filas if x["version"] == v and x["id"] == e["id"])
        md.append(f"| {e['id']} | {e['tipo']} | {e['entrada'][:70]} | {corto(f['salida'])} |  |  |  |")
    ok = [x for x in filas if x["version"] == v and x["tokens"]]
    if ok:
        md.append(f"\nPromedio: {sum(x['tokens'] for x in ok) // len(ok)} tokens y {sum(x['ms'] for x in ok) // len(ok)} ms por solicitud.")
md.append("\n## Conclusión del grupo\n\n- Versión ganadora: …\n- Por qué (con números de la tabla): …\n- Qué cambiamos entre versiones y qué efecto tuvo: …\n")
(RAIZ / "docs/05-prompts.md").write_text("\n".join(md), encoding="utf-8")
print("\n✓ Tabla generada en docs/05-prompts.md · respuestas completas en eval/resultados_prompts.json")
