import os
import random
import re
import genanki
from schemas import DeckRequest

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

def create_anki_package(req: DeckRequest) -> str:
    """Creates the anki package and returns the file path."""
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

    if req.cards and req.cards[0].audio_path:
        out_dir = os.path.dirname(req.cards[0].audio_path)
    else:
        out_dir = "/tmp"

    out_file = os.path.join(out_dir, f"{req.deck_uuid}.apkg")

    package.write_to_file(out_file)
    return out_file
