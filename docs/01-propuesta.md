# 01 · Propuesta del proyecto

**Producto:** Simulador Educativo de Situaciones Viales y Contravenciones (RAG + agente de alcance controlado)
**Versión:** 0.1 (Semana 1) · **Integrantes:** [Integrante 1], [Integrante 2], [Integrante 3]

## 1. Problema real
Conductores y peatones desconocen qué conductas son contravenciones de tránsito, cuánto se multa y qué pasos seguir tras un accidente. La norma existe, pero está organizada por *clases de contravenciones* (primera a séptima) en artículos extensos, difícil de consultar para un ciudadano común. La educación vial tradicional se basa en memorizar, no en decidir ante situaciones.

**Qué pasa hoy sin el sistema:** el ciudadano se informa por redes sociales o noticias (a menudo desactualizadas), memoriza cuestionarios para la licencia, o se entera de la sanción cuando llega la multa.

## 2. Usuarios (perfiles)
| Perfil | Necesidad | Ejemplo de situación |
|---|---|---|
| Conductor particular | Saber qué conductas cotidianas se sancionan y cuánto | Estacionar en lugar prohibido, no usar cinturón |
| Conductor profesional (taxi, bus, carga) | Conocer infracciones propias del transporte | Transportar pasajeros sin título habilitante |
| Peatón / ciclista / motociclista | Conocer sus obligaciones y qué hacer ante un accidente | Cruzar fuera del paso peatonal; pasos tras un choque |

## 3. Solución
Aplicación web de **práctica por situaciones**: el sistema genera un escenario a partir de una **tabla estructurada de contravenciones** (fuente de verdad), el usuario elige qué hacer o identifica la infracción, y recibe retroalimentación formativa con contravención, sanción (calculada por código con el SBU de configuración) y **cita del artículo** recuperada por RAG. Un agente adapta la dificultad y registra el progreso.

## 4. Alcance
**Hace:** genera escenarios validados contra la tabla; evalúa respuestas; calcula multa y puntos; cita el artículo; adapta la dificultad por perfil; guarda progreso; explica pasos básicos ante un accidente (solo con contenido de las fuentes).

**Nunca hará (alcance negativo):**
- Dar asesoría legal individual ni indicar cómo impugnar un caso concreto (deriva a la ANT o a un abogado).
- Dar consejos para evadir controles, sobornar o eludir sanciones (se niega).
- Inventar artículos, montos o puntos: si no está en la tabla o las fuentes, se abstiene.
- Calcular sanciones con el modelo generativo (siempre código determinista).
- Mostrar un escenario que no exista en la tabla (se descarta).
- Almacenar datos personales sensibles (sin cédula, placa ni ubicación).

## 5. Hallazgo crítico sobre las fuentes (decisión pendiente con el docente)
El caso nombra la **LOTTTSV** y su reglamento, pero las **contravenciones, multas y puntos están tipificadas en el COIP (arts. 383–392)**; la LOTTTSV y su reglamento aportan obligaciones, definiciones y procedimientos. Además, una reforma vigente desde agosto de 2021 habría eliminado la reducción de puntos para las clases tercera a séptima (según un medio de prensa; **verificar en el texto oficial**). Por tanto, la tabla debe admitir `puntos = 0` y el simulador no puede prometer "puntos restados" en todas las infracciones.

**Propuesta:** incluir el COIP como fuente adicional y pedir aprobación escrita al docente. El plazo formal para proponer cambios de base de conocimiento era el 15 de octubre, así que debe plantearse como aclaración de fuente, no como cambio de dominio.

## 6. Modelo generativo (propuesta, a confirmar por el equipo)
- **Gemini (capa gratuita)** con salida JSON estructurada para generar escenarios; alternativa: Groq (capa gratuita). Justificación: sin costo, salida estructurada, buen español. Temperatura baja (≈0.3) para evaluación y media (≈0.7) para generación; `max_tokens` acotado.
- Embeddings locales `sentence-transformers` multilingües (sin cuota ni costo).

## 7. Riesgos
| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Escenario inventado / contravención inexistente | Alta | Alto | Validación contra tabla; descartar y regenerar; medir % válidos |
| Normativa o SBU desactualizados | Media | Alto | SBU en `config/settings.yaml`; fecha de vigencia en metadatos |
| Cita de artículo incorrecta | Media | Alto | Metadato `articulo` por fragmento; 20 escenarios de referencia |
| Agotamiento de cuota gratuita | Media | Medio | Reintentos con backoff, caché de escenarios, avisar al docente |
| Prompt injection / pedidos de evasión | Media | Alto | Filtro de dominio, system prompt versionado, pruebas de negativa |
| Trabajo concentrado en un integrante | Media | Medio | Ramas por funcionalidad, PR revisados entre pares |
