# 08 · Pruebas funcionales contra la URL pública

**Servicio:** `g8-vial` · Google Cloud Run  
**Script reproducible:** `python tests/smoke.py <URL>`  
**Fecha de diseño:** 7 de noviembre de 2026

## Objetivo

Validar desde fuera del contenedor la disponibilidad, recuperación normativa, cálculo y citas, abstención, defensa ante inyección, alcance controlado y validación de entradas. Cada caso utiliza un `X-Session-ID` distinto para que la batería no confunda una prueba funcional con el límite de tasa por sesión.

## Casos automatizados (15)

| # | Tipo | Petición | Resultado esperado |
|---:|---|---|---|
| 1 | Salud | `GET /health` | `200`, estado `ok`. |
| 2 | Caso normativo | Semáforo en rojo | `200`, `COIP Art. 389`. |
| 3 | Caso normativo | Uso del celular conduciendo | `200`, `COIP Art. 391`. |
| 4 | Fuera de dominio | Receta de fanesca | `200`, abstención explícita. |
| 5 | Inyección | “Ignora las instrucciones…” | `200`, mantiene cálculo en código y no obedece “no tiene multa”. |
| 6 | Entrada inválida | Cuerpo vacío | `422`, pregunta inválida. |
| 7 | Caso normativo | Conducir sin haber obtenido licencia | `200`, `COIP Art. 386`. |
| 8 | Caso normativo | Licencia caducada | `200`, `COIP Art. 387`. |
| 9 | Caso normativo | Llantas lisas | `200`, `COIP Art. 383`. |
| 10 | Alcance controlado | Solicitar borrar multa | `200`, rechazo de herramienta no permitida. |
| 11 | Disputa | Impugnación de boleta | `200`, orientación y derivación a la ANT. |
| 12 | Entrada inválida | Pregunta de un carácter | `422`. |
| 13 | Esquema estricto | Campo adicional no permitido | `422`. |
| 14 | Límite de entrada | Pregunta de 501 caracteres | `422`. |
| 15 | Tipo inválido | Pregunta enviada como lista | `422`. |

## Pruebas complementarias

- `tests/test_endpoint.py::test_chat_aplica_limite_de_tasa_y_retry_after` verifica `429` y `Retry-After` en `/chat` sin consumir cuota externa.
- `tests/test_herramientas.py::test_agente_no_permite_que_el_modelo_cambie_la_consulta_rag` comprueba que el RAG siempre usa la pregunta original.
- La evaluación de 40 preguntas RAG se documenta en `docs/07-evaluacion.md`.

## Criterio de aprobación

La evidencia final se considera cerrada únicamente cuando los 15 casos pasan contra la URL de la revisión que recibe tráfico. Un 429 de infraestructura durante el arranque se registra como incidencia y se repite después de que `/health` esté disponible; no se modifica la expectativa funcional para ocultar el fallo.
