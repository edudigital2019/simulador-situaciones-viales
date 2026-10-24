"""Esquemas (Pydantic) de lo que ENTRA al sistema y de lo que el MODELO debe devolver.

Reglas para que el esquema funcione con el modo estricto de Gemini y Groq:
  - extra="forbid" en cada modelo (no se aceptan campos inventados).
  - Todos los campos son obligatorios; si algo puede faltar, use `tipo | None`.
  - Nada de límites raros en el esquema (minLength, pattern…): esas reglas van en
    validadores de Python. El esquema GUÍA al modelo; la validación la hace su código.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Estricto(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ======================================================================
# EJEMPLO TRABAJADO · Caso 03 · Triaje de soporte (familia: automatización)
# ======================================================================

class Solicitud(BaseModel):
    """Lo que envía el usuario para generar la situación vial."""
    texto: str = Field(min_length=3, max_length=2000, description="Tema o tipo de licencia (ej. Licencia Tipo B, giros prohibidos, etc.)")

# Asegúrate de que las clases Opcion y Escenario queden activas arriba:
class Opcion(Estricto):
    texto: str
    es_correcta: bool
    explicacion: str = Field(description="Por qué es correcta o incorrecta según el COIP o Ley de Tránsito de Ecuador")

class Escenario(Estricto):
    """Simuladores · caso 08 Situaciones viales. La norma exacta (artículo y sanción)
    se consulta en las fuentes; el modelo no debe inventarla."""
    situacion: str = Field(description="Descripción de un caso hipotético en las calles de Ecuador")
    pregunta: str = Field(description="Pregunta de opción múltiple sobre cómo actuar o qué sanción aplica")
    opciones: list[Opcion] = Field(description="Exactamente 3 o 4 opciones de respuesta")
    advertencia: str | None = Field(description="Recordatorio de que es material educativo y no reemplaza la asesoría legal")

# Creamos la respuesta final del API
class RespuestaEscenario(BaseModel):
    escenario: Escenario | None
    requiere_revision_humana: bool
    mensaje: str
    proveedor: str | None = None
