# 06 · Matriz de cumplimiento académico y técnico

**Proyecto:** Simulador educativo de situaciones viales «Vía Segura»  
**Caso:** 08 · Seminario de Titulación en IA Generativa · UNIANDES  
**Fecha de revisión:** 2026-10-27  
**Alcance revisado:** material académico de las semanas 1, 2 y 3, documentación del proyecto, backend, frontend, pruebas y evidencias existentes.

## 1. Propósito

Esta matriz relaciona la base teórica de las clases con la implementación real del proyecto. Su objetivo es evitar dos errores: declarar como terminada una capacidad que solo está documentada y agregar tecnología que no aporta a los criterios del seminario.

Los estados utilizados son:

- **Completo:** existe implementación y evidencia verificable.
- **Parcial:** existe una parte funcional, pero falta una capacidad o evidencia exigida.
- **Faltante:** no existe implementación verificable.
- **No aplicable:** el contenido es formativo, pero no constituye un requisito del producto.

## 2. Definición del producto y del agente

El producto se define como una **aplicación web con un agente educativo de seguridad vial**, arquitectura RAG híbrida, memoria normativa, herramientas deterministas y regla de abstención.

El agente no es autónomo de propósito general. Opera dentro de un flujo controlado y solo puede:

1. recibir perfil, dificultad y tema;
2. buscar normativa vial vigente;
3. seleccionar contravenciones permitidas;
4. solicitar al LLM un escenario estructurado;
5. validar o descartar la propuesta;
6. evaluar la respuesta del estudiante;
7. calcular la sanción mediante código; y
8. responder con cita o abstenerse.

La tríada aplicada es:

| Componente | Responsabilidad | Implementación actual |
|---|---|---|
| Modelo | Redactar escenarios, opciones y explicaciones | Gemini como principal; Groq como respaldo; proveedor simulado para pruebas |
| Memoria/conocimiento | Recuperar artículos y metadatos normativos | Índice JSON RAG; base vectorial todavía pendiente |
| Herramientas | Validar, evaluar y calcular de forma determinista | Funciones Python con pruebas |
| Orquestador | Coordinar el ciclo y los reintentos | Distribuido entre `main.py` y `generador.py`; falta formalizar `AgenteVial` |

## 3. Semana 1 · Fundamentos, prompts y verificación

| ID | Criterio teórico | Estado | Evidencia actual | Brecha o acción |
|---|---|---:|---|---|
| S1-01 | Definir problema, usuarios, alcance positivo y límites | Completo | `docs/01-propuesta.md`, `docs/05-levantamiento.md` | Mantener sincronizados los perfiles con los esquemas del backend |
| S1-02 | Justificar el uso de IA generativa | Completo | `docs/01-propuesta.md` y principio «el modelo propone, el código dispone» | Añadir la formulación final del agente vial |
| S1-03 | Identificar qué información es verificable y cuál exige RAG | Completo | `docs/04-fuentes.md`, `docs/rag/ficha_rag_grupo_08.md` | Vincular cada fuente con su fecha de revisión |
| S1-04 | Aplicar R.E.C.E.T.A. al prompt | Completo | `app/prompts/system_v3.md`, comparación en `docs/05-prompts.md` | Mantener una rúbrica explícita R-E-C-E-T-A en la documentación |
| S1-05 | Delimitar la entrada del usuario como datos | Completo | `<solicitud>` y `<contravenciones_permitidas>` en `app/services/generador.py` | Agregar prueba específica de inyección indirecta desde fragmentos RAG |
| S1-06 | Solicitar una salida con formato verificable | Completo | JSON Schema estricto y modelos Pydantic con `extra="forbid"` | Conservar pruebas de campos extra, faltantes y tipos inválidos |
| S1-07 | Permitir declarar `FALTA` o abstenerse | Completo | `MARCA_FUERA_DE_DOMINIO`, regla de silencio RAG y pruebas | Unificar el texto de abstención entre generación y búsqueda RAG |
| S1-08 | Comparar iteraciones del prompt | Completo | Prompts `system_v1`, `system_v2`, `system_v3` y resultados en `docs/05-prompts.md` | Registrar modelo, fecha y parámetros de cada evaluación |
| S1-09 | Verificar resultados con V.E.R.I.F.I.C.A. | Parcial | Pruebas, fuentes y controles dispersos en `docs/evidencias/` | Crear informe consolidado con los ocho controles y enlaces a evidencias |
| S1-10 | Declarar el uso de IA y atribuir aportes | Parcial | Reparto de trabajo en README y evidencias | Añadir declaración formal de uso de IA y referencias de conversaciones compartidas |
| S1-11 | Controlar permisos del agente | Faltante | No existe una política explícita de capacidades | Documentar herramientas permitidas, ausencia de escrituras externas y acciones que exigirían aprobación |
| S1-12 | Comprender tokens, embeddings, atención e inferencia | No aplicable | Base conceptual del curso | Se documenta como fundamento; no se entrena un LLM en este proyecto |

## 4. Semana 2 · Arquitectura e integración de la aplicación

| ID | Criterio técnico | Estado | Evidencia actual | Brecha o acción |
|---|---|---:|---|---|
| S2-01 | Separar frontend, backend, proveedor y datos | Completo | React/Vite, FastAPI, `ClienteLLM`, configuración y fuentes separadas | Actualizar el diagrama para incluir RAG y el futuro `AgenteVial` |
| S2-02 | Mantener claves únicamente en backend y variables de entorno | Completo | `.env.example`, `app/config.py`, `.gitignore` | Ejecutar y conservar evidencia de un buscador de secretos |
| S2-03 | Desacoplar proveedor, URL, clave y modelo | Completo | Catálogo de proveedores en `app/config.py` | Validar que los identificadores de modelos configurados existan antes del despliegue |
| S2-04 | Usar proveedor principal, reintentos y respaldo | Completo | `app/services/llm.py` con retroceso exponencial y conmutación | Añadir métricas agregadas de fallos y uso del respaldo |
| S2-05 | Validar la salida del modelo | Completo | `generar_json()` y esquemas Pydantic | Mantener reparación limitada y fallo seguro tras salida inválida |
| S2-06 | Aplicar límites de tasa y devolver 429/Retry-After | Completo | `app/services/limite_tasa.py`, endpoint `/escenarios` | Evaluar persistencia o limitación distribuida si se despliega en varias instancias |
| S2-07 | Mantener reglas críticas en backend | Completo | Validación jurídica, evaluación y sanción en Python | Evitar duplicar reglas de negocio únicamente en el frontend |
| S2-08 | No confiar en historial o estado enviado por el navegador | Completo | El backend conserva el escenario y lo asocia a la sesión | La memoria es volátil; documentar expiración y límites |
| S2-09 | Evitar cálculos críticos en el LLM | Completo | `calcular_sancion.py` usa `Decimal` y parámetros externos | Verificar oficialmente el SBU antes de cada despliegue |
| S2-10 | Construir una interfaz funcional y segura | Completo | `frontend/src/App.tsx`, renderizado JSX y flujo de escenarios | Agregar panel opcional de evidencia RAG y accesibilidad automatizada |
| S2-11 | Manejar estados de carga, error, límite y disponibilidad | Parcial | El frontend maneja el flujo principal y errores del API | Revisar todos los estados: 422, 429, 502, 503, reintento y expiración |
| S2-12 | Disponer de modo de prueba sin consumir API | Completo | Proveedor `simulado` y pruebas con dobles del modelo | Documentar comando único para levantar la demostración offline |
| S2-13 | Registrar uso, latencia, proveedor y tokens | Completo | `_registrar()` en servicios LLM y generador | Definir retención, anonimización y formato de informe |
| S2-14 | Probar integración de extremo a extremo | Parcial | Pruebas de endpoints e integración simulada | Añadir prueba E2E navegador-backend y conservar evidencia de ejecución |

## 5. Semana 3 · RAG y bases vectoriales

| ID | Criterio RAG | Estado | Evidencia actual | Brecha o acción |
|---|---|---:|---|---|
| S3-01 | Utilizar fuentes propias y verificables | Completo | PDFs jurídicos en `data/raw`, inventario en `docs/04-fuentes.md` | Registrar URL, fecha de descarga, versión y hash de cada fuente |
| S3-02 | Leer y normalizar los documentos | Completo | `pypdf` y `limpiar_texto()` en `scripts/ingest.py` | Añadir informe de errores de extracción por documento |
| S3-03 | Fragmentar por unidad semántica citable | Completo | Corte por artículo legal `Art. X.-` | Mantener prueba de cero fragmentos huérfanos |
| S3-04 | Etiquetar cada fragmento con metadatos útiles | Completo | Documento, archivo, artículo, clase, puntos y vigencia | Añadir fecha/versión normativa y procedencia verificable |
| S3-05 | Aplicar filtros antes del `top-k` | Completo | `vigente=true` y filtros en `app/services/rag.py` | Reproducir la misma regla en la colección vectorial |
| S3-06 | Generar embeddings de los fragmentos | Faltante | No hay modelo ni proceso de embeddings | Seleccionar modelo, documentar dimensión/versión y generar vectores durante ingesta |
| S3-07 | Persistir los vectores en una base vectorial | Faltante | `indice_rag.json` contiene texto, no vectores | Implementar colección persistente ChromaDB, por ejemplo en `data/vector/chroma/` |
| S3-08 | Convertir la consulta en embedding | Faltante | La consulta solo se tokeniza y expande con tesauro | Usar el mismo modelo de embeddings empleado durante la ingesta |
| S3-09 | Recuperar por similitud semántica | Faltante | Recuperación actual mediante coincidencia léxica e IDF | Consultar vecinos semánticos y devolver distancia o similitud |
| S3-10 | Combinar búsqueda semántica y literal | Parcial | Ya existen coincidencia de artículo, tesauro e IDF | Fusionar resultados vectoriales y léxicos con una estrategia reproducible |
| S3-11 | Aumentar el prompt con fragmentos recuperados | Completo | `<contexto_rag_normativo>` en `generador.py` | Incluir identificador, cita y puntaje; limitar tamaño total del contexto |
| S3-12 | Generar una respuesta fundamentada y citable | Completo | El modelo recibe artículos y el código reemplaza la cita por datos canónicos | Añadir comprobación de que toda explicación normativa esté respaldada por un fragmento recuperado |
| S3-13 | Guardar silencio cuando no hay evidencia suficiente | Completo | Umbral, patrones de derivación y pruebas de abstención | Recalibrar el umbral con distancias vectoriales y conjunto de evaluación |
| S3-14 | Evaluar recuperación con preguntas reales | Completo para buscador léxico | 20 preguntas; métricas `hit@1`, `hit@5` y precisión de silencio | Repetir la evaluación con búsqueda vectorial e híbrida y comparar resultados |
| S3-15 | No indexar hechos personales ni valores variables | Completo | El RAG contiene norma; el SBU vive en configuración | Agregar prueba que impida indexar campos personales o valores monetarios calculados |

## 6. Capacidades del agente inteligente

| ID | Capacidad | Estado | Evidencia | Acción |
|---|---|---:|---|---|
| AG-01 | Percibir una solicitud estructurada | Completo | `SolicitudEscenario` | Ninguna crítica |
| AG-02 | Recuperar conocimiento externo al LLM | Parcial | RAG léxico conectado | Completar embeddings y base vectorial |
| AG-03 | Usar herramientas especializadas | Completo en flujo controlado | Recuperación, validación, evaluación y cálculo | Definir contratos uniformes de herramienta |
| AG-04 | Observar el resultado de una herramienta | Completo básico | El generador recibe validación o excepción | Registrar observaciones sin datos sensibles |
| AG-05 | Corregir o reintentar | Completo básico | Reintentos por escenario inválido y fallos del proveedor | Diferenciar reintento del LLM, del proveedor y del agente |
| AG-06 | Decidir cuándo finalizar | Completo por reglas | Retorna escenario válido, abstención o error controlado | Formalizar estados del ciclo |
| AG-07 | Mantener memoria de trabajo | Parcial | Escenarios en memoria por sesión | Documentar expiración; valorar SQLite solo si el alcance lo requiere |
| AG-08 | Invocar herramientas mediante tool calling del LLM | No aplicable por ahora | Las herramientas son orquestadas por Python | No es necesario para demostrar un agente controlado; implementarlo solo si la rúbrica lo exige explícitamente |
| AG-09 | Aplicar permisos mínimos | Faltante documental | Las herramientas actuales no realizan acciones irreversibles | Crear política de capacidades y límites |
| AG-10 | Explicar con evidencia | Parcial | Cita jurídica y explicación educativa | Mostrar en la UI las fuentes RAG usadas y sus metadatos |

## 7. Matriz V.E.R.I.F.I.C.A.

| Letra | Control | Estado | Evidencia disponible | Evidencia pendiente |
|---|---|---:|---|---|
| V | Valida la premisa | Parcial | Fuentes y reglas jurídicas documentadas | Lista de supuestos revisados: vigencia, SBU, modelos y versiones |
| E | Exige evidencia | Parcial | PDFs, tabla canónica y citas | URLs oficiales, fechas, hashes y comprobación manual de artículos |
| R | Replica y contrasta | Parcial | Gemini principal y Groq de respaldo | Informe reproducible comparando resultados de ambos modelos |
| I | Inspecciona el código | Parcial | Pruebas y revisión estructural | Reportes de análisis estático, secretos y dependencias vulnerables |
| F | Fuerza con pruebas | Completo en código | Pruebas de herramientas, LLM, endpoints y RAG | Evidencia actualizada de ejecución en verde y cobertura |
| I | Identifica datos y riesgos legales | Parcial | UUID de sesión y aviso educativo | Tabla de datos, destino de APIs, minimización y retención |
| C | Controla al agente | Faltante documental | Flujo restringido por código | Lista de permisos, entornos y operaciones que requieren aprobación |
| A | Atribuye y documenta | Parcial | Reparto del equipo y documentación | Declaración de uso de IA y referencias de chats compartidos |

## 8. Inconsistencias que deben corregirse

1. **Base vectorial declarada frente a implementada:** algunos documentos presentan ChromaDB como arquitectura prevista, pero la ejecución actual usa un índice JSON y búsqueda léxica.
2. **Identificador del modelo:** la documentación debe distinguir el valor configurado del modelo efectivamente disponible y utilizado en una ejecución.
3. **SBU:** `config/parametros.json` define USD 482 para 2026, mientras documentos anteriores todavía muestran USD 460. La configuración vigente debe ser la única fuente operativa y debe verificarse oficialmente.
4. **Concepto de agente:** actualmente existe conducta agéntica mediante un pipeline controlado, pero no una clase o módulo explícito llamado `AgenteVial` ni tool calling dinámico.
5. **Estado de las pruebas:** la existencia de archivos de prueba no sustituye una evidencia reciente de ejecución con sus dependencias instaladas.
6. **RAG y tabla canónica:** el RAG recupera normativa; la tabla canónica autoriza contravenciones. Ambos roles deben permanecer separados en la documentación.

## 9. Plan de implementación priorizado

### Fase 1 · Cerrar la brecha vectorial

1. Elegir y configurar un modelo de embeddings.
2. Crear una colección persistente `normativa_vial` en ChromaDB.
3. Extender `scripts/ingest.py` para insertar texto, vector, ID y metadatos.
4. Implementar consulta vectorial con filtros previos por vigencia.
5. Combinar resultados vectoriales con coincidencia literal de artículos.
6. Recalibrar silencio y ejecutar las 20 preguntas de evaluación.

### Fase 2 · Formalizar el agente

1. Crear `app/services/agente_vial.py` como fachada del caso de uso.
2. Definir contratos para `buscar_normativa`, `consultar_contravenciones`, `validar_escenario`, `evaluar_respuesta` y `calcular_sancion`.
3. Modelar los estados: solicitud, recuperación, generación, validación, corrección, respuesta y abstención.
4. Documentar permisos y límites del agente.

### Fase 3 · Evidencia visible y experiencia de usuario

1. Mostrar artículos recuperados y citas utilizadas en un panel opcional.
2. Mostrar abstención y derivación de manera pedagógica.
3. Completar estados de error y accesibilidad.
4. Añadir prueba E2E del flujo completo.

### Fase 4 · Verificación y entrega

1. Ejecutar pruebas, análisis estático, buscador de secretos y auditoría de dependencias.
2. Verificar fuentes, SBU, vigencia normativa y modelos disponibles.
3. Completar el informe V.E.R.I.F.I.C.A.
4. Actualizar README, arquitectura y evidencias sin afirmar capacidades inexistentes.

## 10. Criterios de finalización

El proyecto podrá declarar completa la arquitectura propuesta cuando se demuestre que:

- cada fragmento normativo tiene embedding y metadatos persistidos;
- una consulta ciudadana recupera artículos por significado y no solo por palabras;
- el filtro de vigencia se aplica antes del `top-k`;
- el modelo recibe únicamente fragmentos recuperados y contravenciones autorizadas;
- toda sanción y evaluación se calcula con herramientas deterministas;
- una consulta sin respaldo produce abstención;
- el flujo está encapsulado y documentado como agente controlado;
- la interfaz permite verificar las citas utilizadas; y
- las pruebas y los ocho controles V.E.R.I.F.I.C.A. tienen evidencia reciente.

## 11. Próximo incremento recomendado

El siguiente incremento técnico es **implementar embeddings y persistencia vectorial sin eliminar el buscador léxico existente**. El resultado debe ser un recuperador híbrido evaluado con el mismo banco de 20 preguntas, de modo que la mejora pueda demostrarse con métricas y no solo con una descripción arquitectónica.
