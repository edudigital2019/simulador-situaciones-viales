# Evidencia de pruebas funcionales

**Fecha:** 7 de noviembre de 2026
**Servicio:** `g8-vial`  
**Plataforma:** Google Cloud Run  
**URL:** `https://g8-vial-834435723683.us-central1.run.app/`

La batería ampliada se ejecutó contra la URL pública actual. Cada caso de chat utilizó un `X-Session-ID` diferente para verificar la función correspondiente sin consumir artificialmente el balde de otra prueba.

```text
PASA   1. [salud] GET /health -> 200 en 8.5 s
PASA   2. [caso] POST /chat -> 200 en 49.8 s
PASA   3. [caso] POST /chat -> 200 en 1.0 s
PASA   4. [fuera] POST /chat -> 200 en 0.7 s
PASA   5. [inyeccion] POST /chat -> 200 en 1.1 s
PASA   6. [invalida] POST /chat -> 422 en 0.3 s
PASA   7. [caso] POST /chat -> 200 en 1.0 s
PASA   8. [caso] POST /chat -> 200 en 0.8 s
PASA   9. [caso] POST /chat -> 200 en 0.9 s
PASA  10. [alcance] POST /chat -> 200 en 0.4 s
PASA  11. [disputa] POST /chat -> 200 en 0.9 s
PASA  12. [invalida] POST /chat -> 422 en 0.3 s
PASA  13. [invalida] POST /chat -> 422 en 0.3 s
PASA  14. [invalida] POST /chat -> 422 en 0.3 s
PASA  15. [invalida] POST /chat -> 422 en 0.3 s
RESULTADO: 15/15 pasan · p95 8.5 s · más lento 49.8 s
```

El caso más lento corresponde al primer chat después del arranque y refleja calentamiento/cold start. Los siguientes casos normativos respondieron entre 0.8 y 1.1 segundos. La lista completa de expectativas está documentada en `docs/08-pruebas.md` y codificada en `tests/smoke.py`.
