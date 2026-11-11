# Vía Segura · Simulador de situaciones viales

> Seminario «Ingeniería de Software con IA Generativa» · UNIANDES 2026
>
> Caso 08 · Grupo 8
>
> Integrantes: Fausto Cando, Isidoro Guaman y Luis Naranjo

## Qué problema resuelve y para quién

Vía Segura ayuda a conductores, peatones y estudiantes a comprender situaciones viales y contravenciones de tránsito en Ecuador. El sistema presenta escenarios educativos y responde consultas utilizando normativa del COIP y la LOTTTSV. Las citas se recuperan mediante RAG y las sanciones se calculan en código para evitar que el modelo invente artículos o montos.

## Demo

- Aplicación: https://g8-vial-834435723683.us-central1.run.app/
- Estado: https://g8-vial-834435723683.us-central1.run.app/health
- Plataforma: Google Cloud Run
- Servicio: `g8-vial`
- Región: `us-central1`
- Arranque en frío medido durante el taller: 12 s

## Arquitectura

```text
[Frontend React]
       |
       v
[FastAPI en Cloud Run]
       |
       +-- POST /chat ------> [Groq] ------> [Agente y herramientas]
       |                                           |
       |                                           +-- RAG normativo
       |                                           +-- Identificación COIP
       |                                           +-- Cálculo de sanción
       |                                           +-- Verificación de cita
       |
       +-- POST /escenarios -> [LLM + validación Pydantic]
       +-- POST /evaluaciones -> [Reglas deterministas]

Respaldo del modelo: proveedor simulado local.
Base de conocimiento: 641 fragmentos incluidos en la imagen del contenedor.
```

El modelo propone y las reglas en Python validan, calculan y verifican las decisiones críticas.

## Cómo ejecutarlo en local

Requisitos: Python 3.11 o 3.12. Node.js solo es necesario para modificar el frontend.

```bash
git clone https://github.com/edudigital2019/simulador-situaciones-viales.git
cd simulador-situaciones-viales
python -m venv .venv
```

Activación en Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
```

Activación en Linux o macOS:

```bash
source .venv/bin/activate
cp .env.example .env
```

Después de completar las variables necesarias en `.env`:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

La aplicación queda disponible en `http://127.0.0.1:8000/` y Swagger en `http://127.0.0.1:8000/docs`.

## Variables de entorno

La plantilla completa está en `.env.example`. El archivo `.env` y las claves reales nunca se suben al repositorio.

| Variable | Uso |
|---|---|
| `LLM_PRINCIPAL` | `gemini`, `groq` o `simulado` |
| `LLM_RESPALDO` | Proveedor alternativo |
| `GEMINI_API_KEY` | Clave de Gemini, si se utiliza |
| `GROQ_API_KEY` | Clave de Groq, si se utiliza |
| `GROQ_MODEL` | Modelo principal de Groq |
| `LLM_TIMEOUT_S` | Tiempo máximo por llamada |
| `LLM_MAX_TOKENS` | Máximo de tokens de salida |
| `LLM_REINTENTOS` | Reintentos ante errores transitorios |

En Cloud Run las claves se configuran como variables protegidas del servicio. GitHub Actions utiliza `GCP_PROJECT_ID` y `GCP_SA_KEY` como secretos del repositorio; sus valores no aparecen en el workflow.

## Despliegue

Despliegue manual equivalente:

```bash
gcloud run deploy g8-vial \
  --source . \
  --region us-central1 \
  --memory 2Gi \
  --min-instances 0 \
  --max-instances 1 \
  --allow-unauthenticated
```

El despliegue habitual lo realiza `.github/workflows/ci-cd.yml` después de que las pruebas terminan correctamente. La publicación automática desde `master` se habilita con la variable de GitHub `HABILITAR_DESPLIEGUE=true`.

- Corrida verde registrada por el taller: https://github.com/edudigital2019/simulador-situaciones-viales/actions/runs/42325256229
- Decisión de despliegue: [`docs/adr/ADR-0003-despliegue.md`](docs/adr/ADR-0003-despliegue.md)

## Datos en producción

| Dato | Dónde vive |
|---|---|
| Índice del RAG y vectores | Dentro de la imagen, solo lectura |
| Documentos normativos | Dentro de la imagen, solo lectura |
| Configuración y prompts | Dentro de la imagen, solo lectura |
| Historial de conversaciones | No se almacena |
| Escenarios temporales | Memoria de la instancia; se pierden al reiniciar |
| Archivos subidos por usuarios | No existen en este proyecto |
| Métricas de llamadas al modelo | Cloud Logging y archivo efímero del contenedor |

Se acepta perder los escenarios temporales porque el proyecto es una demostración educativa y puede generarlos nuevamente. Los documentos normativos y el índice RAG se distribuyen con cada revisión del contenedor.

## Pruebas y evaluación

```bash
# 79 casos de prueba (66 funciones pytest parametrizadas) con proveedor simulado
python -m pytest -q

# Evaluación del RAG
python eval/run_eval.py

# Pruebas funcionales contra Cloud Run
python tests/smoke.py https://g8-vial-834435723683.us-central1.run.app/
```

La corrida final del 8 de noviembre registró 15/15 pruebas funcionales aprobadas, con p95 de 8.7 s y un primer chat de 41.9 s por calentamiento. La salida exacta está en [docs/evidencias/semana-4/pruebas-humo.md](docs/evidencias/semana-4/pruebas-humo.md), el catálogo en [docs/08-pruebas.md](docs/08-pruebas.md) y la evaluación del RAG en [docs/07-evaluacion.md](docs/07-evaluacion.md).

## Integración estable con el modelo

| Control | Estado | Dónde |
|---|---|---|
| Tiempo límite por llamada | Sí | `app/services/llm.py` |
| Reintentos con espera creciente ante 429 o 5xx | Sí | `app/services/llm.py` |
| Proveedor o modelo de respaldo | Sí | `app/config.py` |
| Límite de peticiones por usuario o IP | Parcial | `app/main.py` |
| Tope de entrada y tokens de salida | Sí | `app/schemas.py`, `app/config.py` |
| Mensaje claro cuando el modelo falla | Sí | `app/main.py` |
| Manejo del arranque en frío | Parcial | `tests/smoke.py` |
| Logs sin preguntas, datos personales ni claves | Sí | `app/services/llm.py` |

La conmutación se comprobó configurando temporalmente un modelo inexistente. Groq respondió 404 y el proveedor simulado contestó correctamente en 17 ms, sin mostrar una traza ni devolver un error 500 al usuario. Después de la prueba se restauró `openai/gpt-oss-20b`.

## Decisiones y riesgos

- [Arquitectura](docs/03-arquitectura.md)
- [Fuentes normativas](docs/04-fuentes.md)
- [ADR de despliegue](docs/adr/ADR-0003-despliegue.md)
- [Riesgos y mitigaciones](docs/riesgos.md)

## Limitaciones conocidas

- El respaldo de producción es el proveedor simulado local, no un segundo proveedor externo.
- `/chat` limita la entrada a 500 caracteres y aplica un límite de peticiones por sesión o IP con respuesta `429` y `Retry-After`.
- El limitador de tasa y los escenarios viven en memoria y no se comparten entre varias instancias.
- Cloud Run puede presentar un arranque en frío cuando escala desde cero.
- El contenido es educativo y no reemplaza una fuente oficial ni asesoría jurídica.

## Integrantes y responsabilidades

- **Fausto Cando:** arquitectura, backend, configuración de FastAPI, cliente LLM y pruebas con mocks.
- **Isidoro Guaman:** base normativa, tabla canónica, prompts y evaluación del RAG.
- **Luis Naranjo:** frontend, documentación y evidencias del proyecto.

## Uso de IA durante el desarrollo

Se utilizaron herramientas de IA generativa para apoyar borradores de esquemas, pruebas, documentación e interfaz. El equipo revisó los resultados, contrastó la información normativa y ejecutó las pruebas automatizadas antes de publicar los cambios.

### Aportes y revisión por integrante

- **Fausto Cando:** utilizó IA para apoyar borradores de configuración de FastAPI, cliente LLM, manejo de errores y pruebas con mocks. Revisó manualmente timeouts, reintentos, lista blanca de herramientas, rutas y comportamiento de respaldo.
- **Isidoro Guaman:** utilizó IA para apoyar la estructuración del corpus, tabla canónica, prompts y bancos de evaluación. Revisó artículos, vigencia, sanciones, puntos y resultados Hit@1/Hit@5 contra las fuentes normativas.
- **Luis Naranjo:** utilizó IA para apoyar componentes visuales, textos ciudadanos y documentación. Revisó accesibilidad, claridad de la interfaz, evidencias y correspondencia entre la aplicación desplegada y el material de sustentación.

Las decisiones jurídicas y aritméticas no se delegaron a la IA: el equipo mantuvo la tabla canónica, el SBU configurable, la validación de citas y las pruebas reproducibles. Véanse `docs/07-evaluacion.md`, `docs/08-pruebas.md` y `docs/09-decisiones.md`.
