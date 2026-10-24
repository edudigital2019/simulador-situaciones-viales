"""Endpoint del Simulador de Situaciones Viales con motor RAG (Caso 08).
Busca leyes reales en el COIP/LOTTTSV de Ecuador y las inyecta en el LLM.

Ejecutar:  uvicorn app.main:app --reload     y abrir http://127.0.0
"""
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException

from app.schemas import Escenario, RespuestaEscenario, Solicitud
from app.services.buscador import obtener_contexto_legal  # <-- Nuestro nuevo buscador RAG
from app.services.llm import ClienteLLM, ProveedorNoDisponible, SalidaInvalida, cargar_prompt

app = FastAPI(title="Simulador de Situaciones Viales con RAG · IA Avanzada")
PROMPT_BASE = "system_v3"  # Tu archivo de prompt vial enfocado en la ANT/COIP


@lru_cache
def obtener_llm() -> ClienteLLM:
    return ClienteLLM()


@app.get("/health")
def health():
    return {"estado": "ok"}


@app.post("/generar-escenario", response_model=RespuestaEscenario)
def generar_escenario(solicitud: Solicitud, llm: ClienteLLM = Depends(obtener_llm)):
    try:
        # 1. PASO RAG: Buscar la ley ecuatoriana real basada en lo que escribió el usuario
        leyes_encontradas = obtener_contexto_legal(solicitud.texto)
        
        # 2. Cargar el prompt base del archivo markdown
        prompt_sistema_crudo = cargar_prompt(PROMPT_BASE)
        
        # 3. Inyectar dinámicamente el texto del COIP real en el prompt de la IA
        prompt_sistema_final = prompt_sistema_crudo.replace("{contexto_legal}", leyes_encontradas)
        
        # 4. El LLM consume las instrucciones armadas con base legal real y genera el JSON estricto
        r = llm.generar_json(prompt_sistema_final, solicitud.texto, Escenario)
        
    except ProveedorNoDisponible as e:
        raise HTTPException(status_code=503, detail=e.mensaje_usuario)
    except SalidaInvalida as e:
        return RespuestaEscenario(
            escenario=None, 
            requiere_revision_humana=True,
            mensaje=f"Error en la estructura generada por el modelo: {e.mensaje_usuario}"
        )
    
    escenario_generado = r.datos
    
    return RespuestaEscenario(
        escenario=escenario_generado,
        requiere_revision_humana=False,
        mensaje="Escenario vial simulado con éxito basándose en normativa real.",
        proveedor=r.proveedor
    )
