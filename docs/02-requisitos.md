# 02 · Ingeniería de requisitos

## Historias de usuario

**HU-01 · Practicar una situación**
Como conductor particular, quiero recibir una situación vial realista para practicar identificar la infracción sin memorizar artículos. *(P1, P2)*
- Dado que elijo perfil "conductor particular" y nivel básico, cuando pido un escenario, entonces recibo una situación con 3–4 opciones.
- Dado un escenario generado, cuando el sistema lo muestra, entonces su contravención existe en la tabla estructurada.

**HU-02 · Retroalimentación con artículo**
Como usuario, quiero saber por qué mi respuesta fue correcta o incorrecta para aprender la norma. *(P3)*
- Dado que respondo, cuando se evalúa, entonces veo la contravención, la clase y el artículo citado.
- Dado que fallé, cuando veo la retroalimentación, entonces se explica la diferencia con la opción correcta.

**HU-03 · Multa calculada**
Como conductor, quiero ver cuánto me costaría la infracción para dimensionar su gravedad. *(P4)*
- Dado un escenario con 10 % del SBU y SBU de 482, cuando veo la sanción, entonces muestra USD 48,20.
- Dado que cambio el SBU en configuración, cuando reinicio, entonces las multas se recalculan sin tocar código.

**HU-04 · Puntos de licencia**
Como conductor, quiero saber cuántos puntos se restan para entender el riesgo sobre mi licencia. *(P5)*
- Dado una infracción con reducción de puntos, cuando veo la sanción, entonces aparece el número exacto de la tabla.
- Dado una infracción sin reducción de puntos, cuando veo la sanción, entonces indica "no reduce puntos" sin inventar valores.

**HU-05 · Dificultad adaptativa**
Como usuario frecuente, quiero que los escenarios se ajusten a mi nivel para no aburrirme ni frustrarme. *(P6)*
- Dado que acierto 3 seguidas, cuando pido otro escenario, entonces sube la dificultad.
- Dado que fallo 3 seguidas, cuando pido otro, entonces baja o refuerza la clase fallada.

**HU-06 · Progreso**
Como usuario, quiero ver mi puntaje y progreso por clase de contravención para saber qué repasar. *(P7)*
- Dado que completé 5 escenarios, cuando abro mi progreso, entonces veo aciertos totales y por clase.

**HU-07 · Pasos ante un accidente**
Como conductor o peatón, quiero saber qué hacer tras un accidente para actuar correctamente. *(P8)*
- Dado que consulto "qué hago si choco", cuando el sistema responde, entonces cita la fuente de la que toma los pasos.
- Dado que la fuente no cubre mi caso, cuando respondo, entonces indica que no tiene esa información y deriva a la ANT / 911.

**HU-08 · Rechazo de evasión**
Como administrador del producto, quiero que el sistema se niegue a dar consejos para evadir controles para no fomentar infracciones. *(P9)*
- Dado que el usuario pregunta cómo evitar una multa o un control, cuando se procesa, entonces el sistema se niega y ofrece contenido educativo.

**HU-09 · Respuesta fuera de opciones**
Como usuario, quiero un mensaje claro si escribo algo que no es una opción para poder corregirlo. *(P10)*
- Dado que respondo con texto no contenido en las opciones, cuando se evalúa, entonces se pide elegir una opción válida y no se penaliza.

**HU-10 · Varias contravenciones en un escenario**
Como estudiante avanzado, quiero escenarios con más de una infracción para practicar casos reales. *(P11)*
- Dado un escenario multi-infracción, cuando respondo, entonces el sistema lista todas y suma las sanciones calculadas.

**HU-11 · Transparencia de IA**
Como usuario, quiero saber que interactúo con IA y sus límites para no tomarla como asesoría legal.
- Dado que ingreso por primera vez, cuando veo la bienvenida, entonces aparece el aviso de IA, el alcance y ejemplos.

## Requisitos no funcionales (medibles)
| ID | Categoría | Requisito | Cómo se mide |
|---|---|---|---|
| RNF-01 | Calidad | ≥ 90 % de escenarios generados asociados a una contravención de la tabla | Evaluación sobre lote de escenarios |
| RNF-02 | Calidad | 100 % de sanciones calculadas con el SBU de configuración | Prueba automatizada + revisión de código |
| RNF-03 | Trazabilidad | 100 % de retroalimentaciones de los 20 escenarios de referencia citan el artículo correcto | Conjunto de referencia |
| RNF-04 | Rendimiento | Escenario generado en ≤ 8 s (p95); evaluación en ≤ 3 s | Medición en URL desplegada |
| RNF-05 | Seguridad | Ninguna clave en el repositorio ni en el frontend | Revisión de historial + `.gitignore` |
| RNF-06 | Privacidad | No se almacenan cédula, placa ni geolocalización | Revisión de esquema de datos |
| RNF-07 | Disponibilidad | `/health` responde 200 en la URL pública | Prueba contra URL desplegada |
| RNF-08 | Robustez | Ante error o límite del modelo, el usuario ve un mensaje claro y el sistema reintenta con backoff | Prueba con fallo simulado |
| RNF-09 | Observabilidad | Se registra el consumo de tokens por llamada | Log |
