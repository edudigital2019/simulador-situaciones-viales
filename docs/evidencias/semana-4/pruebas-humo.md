# Evidencia de pruebas funcionales

**Fecha:** 11 de noviembre de 2026  
**Commit de la salida registrada:** `29a20ad` (`fix: corrrecciones en frontend, docs y RAG`)

**Versión final desplegada:** `cf8a1cf` (cambios posteriores únicamente de documentación)

**Corrida CI/CD final:** https://github.com/edudigital2019/simulador-situaciones-viales/actions/runs/43142178716

**Resultado de la corrida final:** despliegue y etapa `Ejecutar pruebas de humo` completados correctamente

**Servicio:** `g8-vial`  
**Plataforma:** Google Cloud Run  
**URL probada:** `https://g8-vial-834435723683.us-central1.run.app/`

La salida detallada siguiente se registró contra la URL pública tras desplegar `29a20ad`. Después, la versión documental final `cf8a1cf` se desplegó sobre la misma aplicación y volvió a superar la etapa automatizada de pruebas de humo. Cada caso de chat utilizó un `X-Session-ID` diferente para aislar su estado funcional. En la corrección posterior, el limitador dejó de usar ese UUID y pasó a compartir un único balde por IP.

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

El caso más lento corresponde al primer chat después del arranque y refleja calentamiento e inicialización del modelo de embeddings en memoria. La revisión desplegada del commit `29a20ad` superó los 15 casos funcionales, incluidos recuperación normativa, regla de silencio, inyección indirecta, alcance controlado, disputa y entradas inválidas. La lista completa de expectativas está documentada en `docs/08-pruebas.md` y codificada en `tests/smoke.py`.
