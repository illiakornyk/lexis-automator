from __future__ import annotations

from fastapi import FastAPI, HTTPException
from schemas import DeckRequest, GenerateResponse
from anki_utils import create_anki_package

app = FastAPI(title="Anki Exporter Service")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate", response_model=GenerateResponse)
async def generate_deck(req: DeckRequest) -> GenerateResponse:
    try:
        out_file = create_anki_package(req)
        return GenerateResponse(status="success", file_path=out_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
