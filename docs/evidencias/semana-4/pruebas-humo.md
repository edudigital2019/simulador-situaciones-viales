# Evidencia de pruebas funcionales

**Fecha:** 6 de noviembre de 2026  
**Servicio:** `g8-vial`  
**Plataforma:** Google Cloud Run  
**URL:** `https://g8-vial-834435723683.us-central1.run.app/`

Las pruebas se ejecutaron nuevamente contra la URL actual del servicio. El endpoint `/health` confirmó 641 fragmentos cargados y un modelo configurado, pero cuatro casos funcionales requieren corrección antes de cerrar la evidencia.

```text
PASA   1. [salud] GET /health -> 200 en 0.5 s
FALLA  2. [caso] POST /chat -> 500 en 59.1 s
FALLA  3. [caso] POST /chat -> 500 en 1.1 s
FALLA  4. [fuera] POST /chat -> 200 en 0.6 s
FALLA  5. [inyeccion] POST /chat -> 200 en 0.4 s
PASA   6. [invalida] POST /chat -> 422 en 0.3 s
RESULTADO: 2/6 pasan · p95 59.1 s · más lento 59.1 s
```

Los casos 2 y 3 devolvieron un error interno. Los casos 4 y 5 respondieron sin ejecutar el flujo determinista esperado del agente. No se considera cerrada esta evidencia hasta corregirlos y repetir la prueba.
