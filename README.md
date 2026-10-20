# simulador-situaciones-viales

Aplicación web educativa (RAG + agente de alcance controlado) que genera situaciones viales a partir de una tabla estructurada de contravenciones, evalúa respuestas y retroalimenta con sanción calculada y cita del artículo.

> Estado: **Semana 1 (diseño)**. Documentación en `docs/`.

## Documentación
- `docs/01-propuesta.md` · `02-requisitos.md` · `03-arquitectura.md` · `04-fuentes.md` · `05-levantamiento.md` · `06-plan-y-reparto.md`

## Instalación (local)
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # completar la clave SOLO en tu .env local
uvicorn app.main:app --reload
```
Verificar: http://localhost:8000/health → `{"status":"ok"}`

## Variables de entorno
Ver `.env.example`. Nunca subir `.env` al repositorio.

## Integrantes y aporte
| Integrante | Aporte |
|---|---|
| [Fausto Cando] | software-architect|
| [Isidoro Guaman] | devops-engineer|
| [Luis Naranjo] | backend-developer|

## Declaración de uso de IA
_Completar: herramientas usadas, para qué y qué se verificó manualmente._
