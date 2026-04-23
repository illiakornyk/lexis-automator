from typing import List, Optional
from pydantic import BaseModel

class CardData(BaseModel):
    word: str
    partOfSpeech: str
    phonetic: str
    definition: str
    example: str
    audio_path: Optional[str] = None

class DeckRequest(BaseModel):
    deck_name: str
    deck_uuid: str
    cards: List[CardData]
    include_recognition: bool = True
    include_production: bool = False
    include_cloze: bool = False
    include_type_in: bool = False
