"""Servicio de búsqueda semántica/palabras clave para el Simulador Vial.
Actúa como el motor RAG básico leyendo el archivo de texto extraído.
"""
from pathlib import Path

# Determinar la ruta al archivo de texto generado
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TXT_PATH = BASE_DIR / "data" / "raw" / "AMT-COIP-CAPITULO-TRANSITO.txt"


def obtener_contexto_legal(termino_busqueda: str) -> str:
    """Busca en el archivo de texto los fragmentos relacionados con el término."""
    if not TXT_PATH.exists():
        return "No hay documentos legales de respaldo disponibles en el servidor."

    with open(TXT_PATH, "r", encoding="utf-8") as f:
        contenido = f.read()

    # Dividimos el documento por las páginas que marcamos en el script extractor
    paginas = contenido.split("--- PÁGINA ")
    fragmentos_encontrados = []
    
    # Buscaremos palabras clave en minúsculas para evitar problemas de capitalización
    termino_limpio = termino_busqueda.lower().strip()
    
    # Un desglose simple de términos comunes para mejorar la puntería de la búsqueda
    palabras = [p for p in termino_limpio.split() if len(p) > 3]

    for pagina in paginas:
        texto_pagina = pagina.lower()
        # Si la página contiene el término completo o palabras clave importantes
        if termino_limpio in texto_pagina or any(palabra in texto_pagina for palabra in palabras):
            # Limpiamos el formato y recuperamos la página con su texto original
            fragmentos_encontrados.append(f"--- DETALLE LEGAL RELEVANTE ---\n{pagina.strip()}")
            
        # Limitamos a un máximo de 3 páginas de contexto para no saturar los tokens del LLM
        if len(fragmentos_encontrados) >= 3:
            break

    if not fragmentos_encontrados:
        # Si no encuentra coincidencia específica, devolvemos las primeras páginas como respaldo general
        return "\n\n".join(paginas[:2])

    return "\n\n".join(fragmentos_encontrados)
