import os
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import genanki

app = FastAPI(title="Anki Exporter Service")

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

# Hardcode some IDs for stability or generate dynamically if preferred
# Here we'll generate dynamically based on the UUID but stable IDs are better
# for Anki updates if we ever needed them. For now, we'll just use random.

def generate_model_id():
    return random.randrange(1 << 30, 1 << 31)

def get_base_model(req: DeckRequest):
    templates = []

    if req.include_recognition:
        templates.append({
            'name': 'Recognition',
            'qfmt': '<div style="text-align:center; font-size: 24px; font-weight: bold;">{{Word}}</div>'
                    '<div style="text-align:center; color: gray;">{{PartOfSpeech}} &bull; {{Phonetic}}</div>',
            'afmt': '{{FrontSide}}<hr id="answer">'
                    '<div style="text-align:left; font-size: 18px; margin-bottom: 12px;"><b>Definition:</b> {{Definition}}</div>'
                    '<div style="text-align:left; font-style: italic; color: #555;">"{{Example}}"</div>'
                    '<div>{{Audio}}</div>',
        })

    if req.include_production:
        templates.append({
            'name': 'Production',
            'qfmt': '<div style="text-align:center; font-size: 18px;"><b>Definition:</b> {{Definition}}</div>',
            'afmt': '{{FrontSide}}<hr id="answer">'
                    '<div style="text-align:center; font-size: 24px; font-weight: bold;">{{Word}}</div>'
                    '<div style="text-align:center; color: gray;">{{PartOfSpeech}} &bull; {{Phonetic}}</div>'
                    '<div style="text-align:left; font-style: italic; color: #555; margin-top: 12px;">"{{Example}}"</div>'
                    '<div>{{Audio}}</div>',
        })

    if req.include_type_in:
        templates.append({
            'name': 'Type-In',
            'qfmt': '<div style="text-align:center; font-size: 18px; margin-bottom: 16px;"><b>Definition:</b> {{Definition}}</div>'
                    '{{type:Word}}',
            'afmt': '<div style="text-align:center; font-size: 18px; margin-bottom: 16px;"><b>Definition:</b> {{Definition}}</div>'
                    '{{type:Word}}<hr id="answer">'
                    '<div style="text-align:center; color: gray;">{{PartOfSpeech}} &bull; {{Phonetic}}</div>'
                    '<div style="text-align:left; font-style: italic; color: #555; margin-top: 12px;">"{{Example}}"</div>'
                    '<div>{{Audio}}</div>',
        })

    # If no base templates are selected but Cloze is, we still need a dummy model or we skip it.
    # Usually we won't hit this if UI validation requires at least one checked.
    if not templates:
        return None

    return genanki.Model(
        generate_model_id(),
        'Lexis Automator Base Model',
        fields=[
            {'name': 'Word'},
            {'name': 'PartOfSpeech'},
            {'name': 'Phonetic'},
            {'name': 'Definition'},
            {'name': 'Example'},
            {'name': 'Audio'},
        ],
        templates=templates,
        css='.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }'
    )

def get_cloze_model():
    return genanki.Model(
        generate_model_id(),
        'Lexis Automator Cloze Model',
        model_type=genanki.Model.CLOZE,
        fields=[
            {'name': 'Text'},
            {'name': 'Extra'},
            {'name': 'Audio'},
        ],
        templates=[
            {
                'name': 'Cloze',
                'qfmt': '{{cloze:Text}}',
                'afmt': '{{cloze:Text}}<br><br>{{Extra}}{{Audio}}',
            },
        ],
        css='.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; } .cloze { font-weight: bold; color: blue; }'
    )


@app.post("/generate")
async def generate_deck(req: DeckRequest):
    deck_id = generate_model_id()
    deck = genanki.Deck(deck_id, req.deck_name)

    base_model = get_base_model(req)
    cloze_model = get_cloze_model() if req.include_cloze else None

    media_files = []

    for card in req.cards:
        # Prepare audio field
        audio_field = ""
        if card.audio_path and os.path.exists(card.audio_path):
            media_files.append(card.audio_path)
            filename = os.path.basename(card.audio_path)
            audio_field = f"[sound:{filename}]"

        # Add basic cards if base_model exists
        if base_model:
            note = genanki.Note(
                model=base_model,
                fields=[
                    card.word,
                    card.partOfSpeech,
                    card.phonetic,
                    card.definition,
                    card.example,
                    audio_field
                ]
            )
            deck.add_note(note)

        # Add cloze card if requested
        if cloze_model and card.word.lower() in card.example.lower():
            # Automatically create a cloze deletion for the word in the example
            # This is a basic replacement, might need regex for exact word boundary
            import re
            pattern = re.compile(re.escape(card.word), re.IGNORECASE)
            cloze_text = pattern.sub(f"{{{{c1::{card.word}}}}}", card.example, count=1)

            extra_info = f"<div style='text-align:left; font-size: 16px;'><b>{card.word}</b> ({card.partOfSpeech}) &bull; {card.phonetic}<br><br>{card.definition}</div>"

            cloze_note = genanki.Note(
                model=cloze_model,
                fields=[
                    cloze_text,
                    extra_info,
                    audio_field
                ]
            )
            deck.add_note(cloze_note)

    package = genanki.Package(deck)
    package.media_files = media_files

    # Save to the shared volume directory
    # Assume the NestJS backend creates a folder at /tmp/lexis-export-[uuid]/ or similar
    # and passes the paths correctly. We will write output to the same directory as the audio.

    if req.cards and req.cards[0].audio_path:
        out_dir = os.path.dirname(req.cards[0].audio_path)
    else:
        out_dir = "/tmp"

    out_file = os.path.join(out_dir, f"{req.deck_uuid}.apkg")

    package.write_to_file(out_file)

    return {"status": "success", "file_path": out_file}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
