from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


class CardData(BaseModel):
    word: str
    partOfSpeech: str
    phonetic: str
    definition: str
    example: str
    audio_path: Optional[str] = None
    image_path: Optional[str] = None


class CustomTemplateSchema(BaseModel):
    name: str
    is_cloze: bool
    qfmt: str
    afmt: str


class DeckRequest(BaseModel):
    deck_name: str
    deck_uuid: str
    output_dir: str
    cards: List[CardData]
    templates: List[CustomTemplateSchema]


class GenerateResponse(BaseModel):
    status: str
    file_path: str
