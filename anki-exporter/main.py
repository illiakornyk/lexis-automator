from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI, HTTPException
from schemas import DeckRequest, GenerateResponse
from anki_utils import create_anki_package

logger = logging.getLogger(__name__)

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
        logger.exception("Failed to generate Anki package for deck %s", req.deck_uuid)
        raise HTTPException(status_code=500, detail="Failed to generate Anki package") from e


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
