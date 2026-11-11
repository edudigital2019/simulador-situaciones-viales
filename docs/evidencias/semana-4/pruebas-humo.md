# Evidencia de pruebas funcionales

**Fecha:** 8 de noviembre de 2026  
**Commit probado:** `d8a1931` (`feat: implementar bucle iterativo hibrido del agente`)  
**Origen de la evidencia:** GitHub Actions, etapa `Ejecutar pruebas de humo`  
**Enlace a la corrida verde de GitHub Actions (15/15):**  
https://github.com/edudigital2019/simulador-situaciones-viales/actions/runs/42325256229
**Servicio:** `g8-vial`  
**Plataforma:** Google Cloud Run  
**URL probada:** `https://g8-vial-834435723683.us-central1.run.app/`

La batería ampliada se ejecutó contra la URL pública actual. Cada caso de chat utilizó un `X-Session-ID` diferente para verificar la función correspondiente sin consumir artificialmente el balde de otra prueba.

```text
PASA   1. [salud] GET /health -> 200 en 0.2 s
PASA   2. [caso] POST /chat -> 200 en 41.9 s
PASA   3. [caso] POST /chat -> 200 en 1.2 s
PASA   4. [fuera] POST /chat -> 200 en 0.6 s
PASA   5. [inyeccion] POST /chat -> 200 en 1.1 s
PASA   6. [invalida] POST /chat -> 422 en 0.1 s
PASA   7. [caso] POST /chat -> 200 en 1.5 s
PASA   8. [caso] POST /chat -> 200 en 0.9 s
PASA   9. [caso] POST /chat -> 200 en 5.3 s
PASA  10. [alcance] POST /chat -> 200 en 8.7 s
PASA  11. [disputa] POST /chat -> 200 en 1.2 s
PASA  12. [invalida] POST /chat -> 422 en 0.1 s
PASA  13. [invalida] POST /chat -> 422 en 0.1 s
PASA  14. [invalida] POST /chat -> 422 en 0.1 s
PASA  15. [invalida] POST /chat -> 422 en 0.1 s
RESULTADO: 15/15 pasan · p95 8.7 s · más lento 41.9 s
```

El caso más lento corresponde al primer chat después del arranque y refleja calentamiento/cold start. La revisión desplegada del commit `d8a1931` superó los 15 casos funcionales, incluidos recuperación normativa, regla de silencio, inyección indirecta, alcance controlado, disputa y entradas inválidas. La lista completa de expectativas está documentada en `docs/08-pruebas.md` y codificada en `tests/smoke.py`.
