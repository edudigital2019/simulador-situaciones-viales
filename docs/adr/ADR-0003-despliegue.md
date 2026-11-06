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