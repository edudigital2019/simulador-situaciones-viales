# Observaciones del tribunal y tratamiento

**Fecha de sustentación:** 7 de noviembre de 2026

| Observación | Decisión | Estado | Evidencia |
|---|---|---|---|
| Demostrar que la respuesta proviene de documentación y no de una invención del modelo. | Mantener trazabilidad RAG, usar la pregunta original y cruzar cita con tabla canónica. | Corregida en la entrega final. | `app/services/agente.py`, `app/services/rag.py` y prueba de regresión. |
| El caso “semáforo en rojo” devolvió un artículo existente pero incorrecto. | La coincidencia clara de la conducta prevalece sobre un artículo RAG equivocado; la respuesta cita el fragmento de la sanción identificada. | Corregida. | Se espera `COIP Art. 389`; pruebas del agente/RAG en verde. |
| Reducir llamadas innecesarias al modelo. | Generación usa IA; evaluación, cálculo y validación crítica quedan en Python. | Corregida previamente y conservada. | `/evaluaciones` y `app/tools/calcular_sancion.py`. |
| Falta límite de tasa en `/chat`. | Añadir un limitador independiente con `429` y `Retry-After`. | Corregida. | `app/main.py` y prueba unitaria de endpoint. |
| La confirmación humana era solo una etiqueta visual. | Crear una acción pendiente en el backend; registrar la consulta solo al confirmar y no modificar el progreso al descartar. | Corregida. | Endpoints `/chat/acciones/{id}/confirmar` y `/descartar`, interfaz y pruebas de idempotencia/aislamiento por sesión. |
| `ajustar_dificultad` sugería un nivel, pero el siguiente escenario no lo consumía. | Aplicar en el backend la dificultad guardada después de cada evaluación y mostrar la adaptación en la interfaz. | Corregida. | `crear_escenario`, indicador “Nivel adaptado según tu progreso” y prueba de integración baja → media. |
| Las pruebas de humo y README tenían resultados contradictorios. | Ampliar la batería a 15 casos y actualizar evidencia solo con una corrida real de la revisión desplegada. | Corregida. | `tests/smoke.py`, `docs/08-pruebas.md` y `docs/evidencias/semana-4/pruebas-humo.md`. |
| Registrar decisiones y aportes del equipo. | Crear documento de decisiones y ampliar declaración individual. | Corregida documentalmente. | `docs/09-decisiones.md` y README. |

La evidencia de Cloud Run corresponde a la corrida real de la revisión desplegada y no a una ejecución simulada.
