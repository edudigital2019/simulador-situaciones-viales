"""Script de extracción de texto para el Simulador Vial.
Lee el PDF de tránsito de Ecuador y lo convierte a texto plano estructurado.
"""
from pathlib import Path
import pypdf

# Configuración de rutas relativas basadas en tu arquitectura
BASE_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = BASE_DIR / "data" / "raw" / "AMT-COIP-CAPITULO-TRANSITO.pdf"
OUTPUT_PATH = BASE_DIR / "data" / "raw" / "AMT-COIP-CAPITULO-TRANSITO.txt"


def extraer_texto_pdf():
    print(f"🚀 Iniciando extracción del archivo: {PDF_PATH.name}")

    # Validar que el archivo PDF realmente exista en la ruta
    if not PDF_PATH.exists():
        print(f"❌ Error: No se encontró el archivo PDF en {PDF_PATH}")
        print("Asegúrate de que el nombre coincida exactamente.")
        return

    try:
        # Abrir y leer el archivo PDF
        lector = pypdf.PdfReader(PDF_PATH)
        total_paginas = len(lector.pages)
        print(f"📖 Documento detectado con {total_paginas} páginas.")

        texto_completo = []

        # Recorrer cada página y extraer su contenido
        for indice, pagina in enumerate(lector.pages, start=1):
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                # Añadimos un encabezado por página para mantener trazabilidad (clave para el RAG)
                texto_completo.append(f"\n--- PÁGINA {indice} ---\n")
                texto_completo.append(texto_pagina.strip())
            
            # Mostrar progreso en bloques de 5 páginas
            if indice % 5 == 0 or indice == total_paginas:
                print(f"▓ Procesadas {indice}/{total_paginas} páginas...")

        # Guardar el resultado en un archivo .txt plano
        print(f"💾 Guardando texto extraído en: {OUTPUT_PATH.name}")
        with open(OUTPUT_PATH, "w", encoding="utf-8") as archivo_txt:
            archivo_txt.write("".join(texto_completo))

        print("✨ ¡Extracción completada con éxito! El archivo de texto está listo.")

    except Exception as e:
        print(f"❌ Ocurrió un error inesperado durante la lectura: {str(e)}")


if __name__ == "__main__":
    extraer_texto_pdf()
