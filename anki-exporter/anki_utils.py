import os
import random
import re
import genanki
from schemas import DeckRequest

def generate_model_id():
    return random.randrange(1 << 30, 1 << 31)

def get_base_model(template, model_id):
    return genanki.Model(
        model_id,
        template.name,
        fields=[
            {'name': 'Word'},
            {'name': 'PartOfSpeech'},
            {'name': 'Phonetic'},
            {'name': 'Definition'},
            {'name': 'Example'},
            {'name': 'Audio'},
        ],
        templates=[{
            'name': template.name,
            'qfmt': template.qfmt,
            'afmt': template.afmt,
        }],
        css='.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }'
    )

def get_cloze_model(template, model_id):
    return genanki.Model(
        model_id,
        template.name,
        model_type=genanki.Model.CLOZE,
        fields=[
            {'name': 'Text'},
            {'name': 'Extra'},
            {'name': 'Audio'},
        ],
        templates=[{
            'name': template.name,
            'qfmt': template.qfmt,
            'afmt': template.afmt,
        }],
        css='.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; } .cloze { font-weight: bold; color: blue; }'
    )

def create_anki_package(req: DeckRequest) -> str:
    """Creates the anki package and returns the file path."""
    deck_id = generate_model_id()
    deck = genanki.Deck(deck_id, req.deck_name)

    # Create genanki.Model instances from the requested templates
    models = []
    for t in req.templates:
        mid = generate_model_id()
        if t.is_cloze:
            models.append((t, get_cloze_model(t, mid)))
        else:
            models.append((t, get_base_model(t, mid)))

    media_files = []

    for card in req.cards:
        # Prepare audio field
        audio_field = ""
        if card.audio_path and os.path.exists(card.audio_path):
            media_files.append(card.audio_path)
            filename = os.path.basename(card.audio_path)
            audio_field = f"[sound:{filename}]"

        for template_meta, model in models:
            if template_meta.is_cloze:
                if card.word.lower() in card.example.lower():
                    pattern = re.compile(re.escape(card.word), re.IGNORECASE)
                    cloze_text = pattern.sub(f"{{{{c1::{card.word}}}}}", card.example, count=1)
                    extra_info = f"<div style='text-align:left; font-size: 16px;'><b>{card.word}</b> ({card.partOfSpeech}) &bull; {card.phonetic}<br><br>{card.definition}</div>"
                    
                    note = genanki.Note(
                        model=model,
                        fields=[
                            cloze_text,
                            extra_info,
                            audio_field
                        ]
                    )
                    deck.add_note(note)
            else:
                note = genanki.Note(
                    model=model,
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

    package = genanki.Package(deck)
    package.media_files = media_files

    if req.cards and req.cards[0].audio_path:
        out_dir = os.path.dirname(req.cards[0].audio_path)
    else:
        out_dir = "/tmp"

    out_file = os.path.join(out_dir, f"{req.deck_uuid}.apkg")

    package.write_to_file(out_file)
    return out_file
