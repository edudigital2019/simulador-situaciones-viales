# ADR-0003: Despliegue y almacenamiento de datos

## Estado
Aceptado. Validado localmente con Docker y desplegado manualmente en Cloud Run.

## Decisión
Desplegar el simulador de situaciones viales en Google Cloud Run
mediante una imagen Docker que incluya el backend FastAPI,
el frontend React compilado, el modelo de embeddings y el índice del RAG.

- Proyecto: `simulador-vial-g8`
- Servicio: `g8-vial`
- Región: `us-central1`
- URL pública: `https://g8-vial-834435723683.us-central1.run.app/`

## Datos en producción

| Dato | Dónde vive |
|---|---|
| Índice del RAG (fragmentos y vectores) | Dentro de la imagen (solo lectura) |
| Documentos originales del caso | Dentro de la imagen (solo lectura) |
| Configuración (config/, prompts) | Dentro de la imagen (solo lectura) |
| Historial de conversaciones | No existe en nuestro proyecto |
| Lo que registra el agente (tickets, consultas, reclamos) | Se pierde al reiniciar (lo aceptamos) |
| Archivos que sube el usuario | No existe en nuestro proyecto |
| Registros de llamadas al modelo | No existe en nuestro proyecto |

**Lo que aceptamos perder y por qué:** Aceptamos perder los escenarios temporales al reiniciar el contenedor porque corresponden a una demostración educativa y pueden generarse nuevamente. Los documentos normativos y el índice del RAG se incluyen en la imagen y están disponibles en cada arranque.

## Integración y despliegue continuo

El flujo `.github/workflows/ci-cd.yml` revisa secretos y ejecuta las pruebas, la evaluación del RAG y la compilación del frontend en cada push y pull request. Durante las pruebas utiliza el proveedor simulado, sin consumir claves ni cuota de los modelos reales.

Al actualizar `master` o ejecutar manualmente el workflow, el despliegue en Cloud Run solo empieza si el job `pruebas` termina correctamente y la variable `HABILITAR_DESPLIEGUE` del repositorio tiene el valor `true`. Mientras se preparan las credenciales y la infraestructura, el job queda omitido sin afectar la validación de CI.

El repositorio necesita estos secretos en GitHub:

- `GCP_PROJECT_ID`: identificador del proyecto de Google Cloud.
- `GCP_SA_KEY`: credenciales JSON de la cuenta de servicio usada por GitHub Actions.

La cuenta de servicio debe tener permisos para construir la imagen y actualizar el servicio de Cloud Run. Las claves de Gemini y Groq permanecen en la configuración protegida de `g8-vial`; no se incluyen en GitHub ni en la imagen.

Después del despliegue, el pipeline obtiene la URL pública de Cloud Run y ejecuta `tests/smoke.py`. Estas pruebas validan `/health`, dos consultas normativas, la abstención fuera de dominio, la resistencia a una inyección y el rechazo de una entrada inválida.
