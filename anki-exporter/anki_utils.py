import os
import random
import re
import genanki
from schemas import DeckRequest

CARD_CSS = '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }'
CLOZE_CSS = CARD_CSS + ' .cloze { font-weight: bold; color: blue; }'

# Maps Anki field names to how to extract their value from a CardData + audio string
FIELD_VALUE_MAP = {
    'Word':         lambda card, audio: card.word,
    'PartOfSpeech': lambda card, audio: card.partOfSpeech,
    'Phonetic':     lambda card, audio: card.phonetic,
    'Definition':   lambda card, audio: card.definition,
    'Example':      lambda card, audio: card.example,
    'Audio':        lambda card, audio: audio,
}

def generate_model_id():
    return random.randrange(1 << 30, 1 << 31)

def extract_fields_from_template(qfmt: str, afmt: str) -> list[str]:
    """Return unique field names referenced in qfmt/afmt, in order of first appearance."""
    combined = qfmt + ' ' + afmt
    seen: set[str] = set()
    fields: list[str] = []

    # {{FieldName}}, {{#FieldName}}, {{/FieldName}}, {{^FieldName}}
    for m in re.finditer(r'\{\{[#/^]?(\w+)\}\}', combined):
        name = m.group(1)
        if name != 'FrontSide' and name in FIELD_VALUE_MAP and name not in seen:
            seen.add(name)
            fields.append(name)

    # {{type:FieldName}} — type-in cards reuse an existing field
    for m in re.finditer(r'\{\{type:(\w+)\}\}', combined):
        name = m.group(1)
        if name in FIELD_VALUE_MAP and name not in seen:
            seen.add(name)
            fields.append(name)

    return fields or list(FIELD_VALUE_MAP.keys())

def get_base_model(template, model_id):
    field_names = extract_fields_from_template(template.qfmt, template.afmt)
    model = genanki.Model(
        model_id,
        template.name,
        fields=[{'name': f} for f in field_names],
        templates=[{
            'name': template.name,
            'qfmt': template.qfmt,
            'afmt': template.afmt,
        }],
        css=CARD_CSS,
    )
    return model, field_names

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
        css=CLOZE_CSS,
    )

def create_anki_package(req: DeckRequest) -> str:
    """Creates the anki package and returns the file path."""
    deck_id = generate_model_id()
    deck = genanki.Deck(deck_id, req.deck_name)

    # Build (template_meta, model, field_names) triples
    models: list[tuple] = []
    for t in req.templates:
        mid = generate_model_id()
        if t.is_cloze:
            models.append((t, get_cloze_model(t, mid), None))
        else:
            model, field_names = get_base_model(t, mid)
            models.append((t, model, field_names))

    media_files = []

    for card in req.cards:
        # Prepare audio field
        audio_field = ""
        if card.audio_path and os.path.exists(card.audio_path):
            media_files.append(card.audio_path)
            filename = os.path.basename(card.audio_path)
            audio_field = f"[sound:{filename}]"

        for template_meta, model, field_names in models:
            if template_meta.is_cloze:
                if card.word.lower() in card.example.lower():
                    pattern = re.compile(re.escape(card.word), re.IGNORECASE)
                    cloze_text = pattern.sub(f"{{{{c1::{card.word}}}}}", card.example, count=1)
                    extra_info = (
                        f"<div style='text-align:left; font-size: 16px;'>"
                        f"<b>{card.word}</b> ({card.partOfSpeech}) &bull; {card.phonetic}"
                        f"<br><br>{card.definition}</div>"
                    )
                    note = genanki.Note(
                        model=model,
                        fields=[cloze_text, extra_info, audio_field],
                    )
                    deck.add_note(note)
            else:
                field_values = [FIELD_VALUE_MAP[f](card, audio_field) for f in field_names]
                note = genanki.Note(model=model, fields=field_values)
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
