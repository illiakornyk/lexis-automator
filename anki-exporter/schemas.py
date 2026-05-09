from __future__ import annotations

from pydantic import BaseModel


class CardData(BaseModel):
    word: str
    partOfSpeech: str
    phonetic: str
    definition: str
    example: str
    audio_path: str | None = None
    image_path: str | None = None


class CustomTemplateSchema(BaseModel):
    name: str
    is_cloze: bool
    qfmt: str
    afmt: str


class DeckRequest(BaseModel):
    deck_name: str
    deck_uuid: str
    output_dir: str
    cards: list[CardData]
    templates: list[CustomTemplateSchema]


class GenerateResponse(BaseModel):
    status: str
    file_path: str
