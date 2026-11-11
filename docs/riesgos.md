# Riesgos y mitigaciones

## Proveedor de IA no disponible

**Riesgo:** Groq puede responder con errores, exceder su cuota o superar el tiempo límite.

**Mitigación:** El cliente aplica timeout, reintentos con espera creciente y conmutación al proveedor simulado. Si ningún proveedor responde, la API devuelve un mensaje claro con estado 503 y `Retry-After`, sin mostrar una traza al usuario.

## Cuota y abuso

**Riesgo:** Solicitudes repetidas pueden consumir la cuota del proveedor.

**Mitigación:** La entrada de `/chat` está limitada a 500 caracteres y la salida tiene un máximo configurable. Tanto `/chat` como `/escenarios` cuentan con limitador de tasa en memoria (HTTP 429 con cabecera `Retry-After`). La tasa se limita combinando la dirección IP y el identificador de sesión. Como limitación conocida de arquitectura sin base Redis externa, las peticiones se controlan en la memoria de cada instancia activa.

## Arranque en frío

**Riesgo:** Cloud Run puede apagar las instancias sin tráfico y la primera solicitud tarda más mientras carga el modelo de embeddings y el índice.

**Mitigación:** El modelo y el índice se incluyen en la imagen. Las pruebas de humo esperan hasta 90 segundos. Como mejora futura, la interfaz puede mostrar que el servicio está iniciando o Cloud Run puede configurarse con una instancia mínima.

## Estado temporal

**Riesgo:** El almacenamiento del contenedor y las estructuras en memoria se pierden al reiniciar o no se comparten entre instancias.

**Mitigación:** Los documentos normativos y el índice RAG están dentro de la imagen. El proyecto acepta perder los escenarios temporales por tratarse de una demostración educativa. Si se requiere persistencia, debe incorporarse una base externa.

## Respuesta normativa incorrecta o desactualizada

**Riesgo:** Una recuperación imprecisa o una reforma legal posterior puede producir una orientación equivocada.

**Mitigación:** El agente usa una tabla canónica, exige citas recuperadas y calcula las sanciones en código. La interfaz aclara que el resultado es educativo y no reemplaza una fuente oficial ni asesoría jurídica.

## Exposición de credenciales

**Riesgo:** Una clave incluida en Git, una imagen o un registro podría ser utilizada por terceros.

**Mitigación:** Las claves se configuran mediante variables protegidas de Cloud Run y secretos de GitHub Actions. Gitleaks revisa el repositorio y los logs del cliente LLM no registran preguntas ni credenciales.
