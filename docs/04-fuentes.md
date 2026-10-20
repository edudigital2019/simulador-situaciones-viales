# 04 · Inventario de fuentes

> Descargar los textos a `data/raw/` y completar la vigencia con el documento oficial.

| # | Documento | Origen oficial | URL | Publicación / vigencia | Formato | Uso |
|---|---|---|---|---|---|---|
| F1 | COIP, arts. 383–392 (tránsito) y reformas | Asamblea Nacional / Registro Oficial | _completar_ | RO Supl. 180, 10-feb-2014; reformas (incl. 2021): **verificar** | PDF | Contravenciones por clase, multas, puntos |
| F2 | LOTTTSV | Asamblea Nacional / ANT |   | RO Supl. 398, 7-ago-2008 + reformas vigentes | PDF | Obligaciones, definiciones, licencias |
| F3 | Reglamento General de aplicación de la LOTTTSV | ANT | https://www.ant.gob.ec | _completar_ | PDF | Procedimientos, límites, señalización |
| F4 | Acuerdo Ministerial MDT-2025-195 (SBU 2026 = USD 482) | Ministerio del Trabajo | https://www.trabajo.gob.ec | 15-dic-2025; rige desde 1-ene-2026 | PDF | Valor en `config/settings.yaml` |
| F5 | Material de educación vial | ANT | https://www.ant.gob.ec | _completar_ | PDF/web | Pasos ante un accidente, buenas prácticas |
| F6 | Tabla estructurada de contravenciones (la construye el equipo) | Derivada de F1 | `data/tabla_contravenciones.csv` | Versionada en Git | CSV | Fuente de verdad para escenarios y sanciones |

## Vigencia
- Cada fuente lleva `fecha_vigencia` y `fecha_consulta`; se revisa antes de cada despliegue.
- El SBU se actualiza cada año en configuración; **no** vive en el código ni en el prompt.
- Pendiente: confirmar con texto oficial si hubo reformas posteriores a 2021 y qué clases conservan reducción de puntos.

## Estrategia de fragmentación
- **Un fragmento por artículo**, y por numeral cuando el artículo es muy largo (COIP 386–392), porque la cita exigida es por artículo.
- Metadatos: `documento`, `articulo`, `numeral`, `clase`, `fecha_vigencia`, `fuente_url`.
- Embeddings multilingües locales; ChromaDB persistente en `data/chroma/`; `scripts/ingesta.py` reproducible.
- Recuperación: primero **por clave** (artículo/numeral de la tabla); búsqueda semántica solo para contexto adicional.

## Esquema de la tabla (`data/tabla_contravenciones.csv`)
`id, clase, articulo, numeral, descripcion, porcentaje_sbu, puntos_texto_coip, puntos_aplicables, pena_adicional, perfil_aplica, solo_multa_ciclista_peaton, documento_fuente, estado_verificacion` (tabla completa en `data/tabla_contravenciones.csv`, ver `07-tabla-coip.md`)

Filas de ejemplo
| id | clase | descripción | % SBU | puntos | artículo |
|---|---|---|---|---|---|
| C-386-01 | 1ª | Conducir sin haber obtenido licencia | 100 | 0 (el propio art. 386 excluye la reducción en el numeral 1; +3 días de prisión) | COIP 386.1 |
| C-387-02 | 2ª | Conducir con licencia caducada, anulada, revocada o suspendida | 50 | 9 | COIP 387.2 |
| C-391-05 | 6ª | Estacionar en lugar no permitido | 10 | 0 (según reforma 2021) | COIP 391.5 |
| C-392-06 | 7ª | No usar cinturón de seguridad | 5 | 0 (según reforma 2021) | COIP 392.6 |

Cálculo: `multa = porcentaje_sbu / 100 × SBU`. Con SBU 482: 10 % = USD 48,20.
