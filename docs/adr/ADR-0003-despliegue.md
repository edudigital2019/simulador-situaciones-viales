# ADR-0003: Despliegue y almacenamiento de datos

## Estado
Propuesto. Validado localmente con Docker; pendiente de despliegue público.

## Decisión
Desplegar el simulador de situaciones viales en Google Cloud Run
mediante una imagen Docker que incluya el backend FastAPI,
el frontend React compilado, el modelo de embeddings y el índice del RAG.

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

Al actualizar `master`, el despliegue en Cloud Run solo empieza si el job `pruebas` termina correctamente y la variable `HABILITAR_DESPLIEGUE` del repositorio tiene el valor `true`. Mientras se preparan las credenciales y la infraestructura, el job queda omitido sin afectar la validación de CI.

El repositorio necesita estos secretos en GitHub:

- `GCP_PROJECT_ID`: identificador del proyecto de Google Cloud.
- `GCP_SA_KEY`: credenciales JSON de la cuenta de servicio usada por GitHub Actions.

En Secret Manager deben existir `gemini-api-key` y `groq-api-key`, con acceso para la cuenta que ejecuta el servicio de Cloud Run.

La imagen se publica en un repositorio Docker de Artifact Registry llamado `via-segura`, ubicado en `us-central1`.
