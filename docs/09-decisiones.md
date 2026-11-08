# 09 · Decisiones finales de arquitectura y entrega

## 1. RAG incluido en la imagen

**Decisión:** distribuir los 641 fragmentos y sus vectores dentro de la imagen Docker.  
**Alternativa descartada:** Pinecone, Cloud SQL u otra base vectorial externa.  
**Razón:** el corpus es pequeño, versionado y de solo lectura; incluirlo reduce dependencias de red y costos fijos.  
**Costo aceptado:** imagen mayor y arranque en frío aproximado de 12 segundos.

## 2. La pregunta original controla la recuperación

**Decisión:** `buscar_normativa_rag` recibe siempre la pregunta original del ciudadano, aunque el LLM proponga una paráfrasis distinta.  
**Razón:** una reformulación generativa puede cambiar la conducta jurídica y recuperar un artículo existente pero incorrecto.  
**Verificación:** prueba de regresión con semáforo en rojo; se exige `COIP Art. 389`.

## 3. Validación cruzada RAG + tabla canónica

**Decisión:** cuando la conducta tiene una coincidencia léxica clara en la tabla canónica, esa identificación prevalece sobre el bono del primer artículo recuperado. La respuesta final busca el fragmento que corresponda a la sanción identificada.  
**Razón:** “la cita existe” no es suficiente; también debe corresponder a la conducta consultada.

## 4. Cálculo determinista de sanciones

**Decisión:** Python calcula porcentajes, multa y puntos usando `config/parametros.json` y la tabla canónica.  
**Alternativa descartada:** pedir al LLM que calcule o recuerde el SBU.  
**Razón:** evita aritmética no reproducible y valores de años anteriores.

## 5. Agente con alcance controlado

**Decisión:** seis herramientas permitidas, argumentos Pydantic `extra="forbid"` y máximo seis vueltas.  
**Alternativa descartada:** agente libre con acceso a escritura o trámites reales.  
**Razón:** el proyecto es educativo y no puede anular multas, modificar puntos ni emitir decisiones jurídicas.

## 6. Límite de tasa por operación

**Decisión:** usar baldes independientes para `/chat` y `/escenarios`, identificados por UUID de sesión o IP.  
**Razón:** evita que una ráfaga agote cuota del LLM y evita que generar escenarios bloquee consultas normativas legítimas.  
**Limitación:** el estado vive en memoria y no se comparte entre múltiples instancias; una producción horizontal requeriría Redis u otro almacén distribuido.

## 7. Resiliencia del proveedor

**Decisión:** timeout configurable, reintentos con espera exponencial y proveedor de respaldo. Si todos fallan, se devuelve `503` con `Retry-After`.  
**Razón:** un error 429 o 5xx del proveedor no debe convertirse en una traza o un error opaco para el ciudadano.

## 8. Estado y privacidad

**Decisión:** escenarios y progreso viven temporalmente en RAM; no se almacena historial de conversación ni información personal.  
**Razón:** el simulador es anónimo y puede regenerar la actividad.  
**Costo aceptado:** el progreso se pierde al reiniciar la instancia.

## 9. Criterio de despliegue

El pipeline ejecuta pruebas, evaluación RAG y compilación antes de desplegar. Después del despliegue ejecuta pruebas de humo contra la URL. Un fallo posterior al despliegue no implica rollback automático; se verifica la revisión que recibe tráfico y se conserva la evidencia exacta del resultado.

## 10. Uso de IA generativa y responsabilidad humana

La IA apoyó borradores, pruebas, documentación e interfaz. No se aceptaron resultados sin revisión: el equipo contrastó normativa, corrigió el corpus, mantuvo la tabla canónica y ejecutó pruebas automáticas. La responsabilidad final de las reglas de negocio y de la entrega corresponde al equipo.
