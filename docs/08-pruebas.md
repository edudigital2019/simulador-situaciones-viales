# 08 · Pruebas funcionales contra la URL pública

**Servicio:** `g8-vial` · Google Cloud Run  
**Script reproducible:** `python tests/smoke.py <URL>`  
**Fecha de diseño:** 7 de noviembre de 2026

## Objetivo

Validar desde fuera del contenedor la disponibilidad, recuperación normativa, cálculo y citas, abstención, defensa ante inyección, alcance controlado y validación de entradas. Cada caso utiliza un `X-Session-ID` distinto para aislar su estado de sesión; el límite de tasa se aplica de forma independiente mediante un único balde por IP.

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


## Evidencia de ejecución real (11 de noviembre de 2026)

**Servicio:** `g8-vial` · Google Cloud Run  
**URL probada:** `https://g8-vial-834435723683.us-central1.run.app/`  
**Commit de la salida registrada:** `29a20ad`

**Versión final desplegada y validada por CI/CD:** `cf8a1cf` ([corrida 43142178716](https://github.com/edudigital2019/simulador-situaciones-viales/actions/runs/43142178716))

**Comando ejecutado:** `python tests/smoke.py https://g8-vial-834435723683.us-central1.run.app/`

```text
PASA   1. [salud] GET /health -> 200 en 0.5 s
PASA   2. [caso] POST /chat -> 200 en 76.7 s
PASA   3. [caso] POST /chat -> 200 en 1.5 s
PASA   4. [fuera] POST /chat -> 200 en 1.6 s
PASA   5. [inyeccion] POST /chat -> 200 en 1.6 s
PASA   6. [invalida] POST /chat -> 422 en 0.2 s
PASA   7. [caso] POST /chat -> 200 en 1.5 s
PASA   8. [caso] POST /chat -> 200 en 2.2 s
PASA   9. [caso] POST /chat -> 200 en 28.0 s
PASA  10. [alcance] POST /chat -> 200 en 5.9 s
PASA  11. [disputa] POST /chat -> 200 en 7.6 s
PASA  12. [invalida] POST /chat -> 422 en 0.3 s
PASA  13. [invalida] POST /chat -> 422 en 0.3 s
PASA  14. [invalida] POST /chat -> 422 en 0.2 s
PASA  15. [invalida] POST /chat -> 422 en 0.3 s
RESULTADO: 15/15 pasan · p95 28.0 s · más lento 76.7 s
```


