# 09 · Decisiones finales de arquitectura y entrega

## 1. RAG incluido en la imagen

**Decisión:** distribuir los 641 fragmentos y sus vectores dentro de la imagen Docker.  
**Alternativa descartada:** Pinecone, Cloud SQL u otra base vectorial externa.  
**Razón:** el corpus es pequeño, versionado y de solo lectura; incluirlo reduce dependencias de red y costos fijos.  
**Costo aceptado:** imagen mayor. El despertar del contenedor hasta `/health` toma aproximadamente 12 segundos; la primera consulta de `/chat` puede tardar entre 41 y 77 segundos por la carga inicial de embeddings.

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

**Decisión:** usar baldes independientes para `/chat` y `/escenarios`, identificados únicamente por dirección IP. El UUID continúa aislando el estado funcional de cada sesión, pero no modifica la clave del limitador.
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

## 11. Confirmación humana con efecto real

**Decisión:** una respuesta normativa con sanción crea una acción pendiente asociada a la sesión. El backend no registra la consulta hasta recibir una petición explícita de confirmación; al descartar, el progreso permanece intacto.  
**Controles:** la acción solo puede resolverse desde la misma sesión y la operación es idempotente, por lo que repetir la confirmación no duplica el registro.  
**Separación de métricas:** una consulta confirmada no se cuenta como acierto, fallo, multa ni pérdida real de puntos; incrementa `consultas_confirmadas` y conserva el último artículo consultado.  
**Razón:** demuestra intervención humana efectiva sin presentar una consulta educativa como una sanción o evaluación real.

## 12. Dificultad adaptativa aplicada al siguiente escenario

**Decisión:** después de la primera evaluación, `/escenarios` consulta el progreso de la sesión y utiliza `dificultad_sugerida` como nivel efectivo del siguiente escenario.  
**Trazabilidad:** la respuesta conserva `nivel_solicitado`, devuelve el nivel aplicado y marca `dificultad_aplicada_por_progreso`; la interfaz muestra “Nivel adaptado según tu progreso”.  
**Razón:** la sugerencia deja de ser un dato sin consumidor y afecta realmente la generación y validación del escenario siguiente.

## 13. Registro de progreso mediante herramienta del agente

**Decisión:** `/evaluaciones` reemplaza la llamada directa a la función de progreso por una única ejecución de `registrar_progreso` mediante el registro y despachador de herramientas del agente.  
**Sin duplicación:** no se conserva un segundo registro directo y la prueba exige que `total_evaluados` aumente exactamente una vez.  
**Control de autoridad:** la identidad de sesión y el resultado correcto se establecen en el servidor; la tool rechaza invocaciones procedentes del chat o de un contexto distinto de `/evaluaciones`.  
**Costo:** no se agrega una llamada al LLM. La respuesta de evaluación incluye `herramientas_ejecutadas` para hacer auditable la ejecución.

## 14. Bucle híbrido iterativo del agente

**Decisión:** permitir como máximo tres llamadas al modelo por consulta normativa. Las dos primeras se reservan para planificación y selección de herramientas; la tercera sintetiza la respuesta después de observar la traza completa de resultados `tool`. La síntesis solo se acepta si conserva las citas y cifras verificadas; de lo contrario, se utiliza una plantilla determinista como respaldo.
**Cierre controlado:** si el modelo responde antes de ejecutar las herramientas obligatorias, el planificador Python completa recuperación, identificación, cálculo y verificación. El límite total permanece en seis acciones.  
**Razón:** elimina el comportamiento de una única intervención del modelo y demuestra observación iterativa, sin elevar cada consulta a cinco o seis llamadas ni delegar al modelo el cálculo o la validación jurídica.  
**Trazabilidad:** la API devuelve `llamadas_modelo`, `max_llamadas_modelo`, `modo_orquestacion`, mensajes con roles `assistant/tool` y la bitácora de herramientas.
