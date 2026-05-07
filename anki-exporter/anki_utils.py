from __future__ import annotations

import os
import random
import re
from dataclasses import dataclass
from typing import Callable, Optional

import genanki

from schemas import CardData, CustomTemplateSchema, DeckRequest

CARD_CSS = '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }'
CLOZE_CSS = CARD_CSS + ' .cloze { font-weight: bold; color: blue; }'

FieldExtractor = Callable[[CardData, dict[str, str]], str]

FIELD_VALUE_MAP: dict[str, FieldExtractor] = {
    'Word':         lambda card, extra: card.word,
    'PartOfSpeech': lambda card, extra: card.partOfSpeech,
    'Phonetic':     lambda card, extra: card.phonetic,
    'Definition':   lambda card, extra: card.definition,
    'Example':      lambda card, extra: card.example,
    'Audio':        lambda card, extra: extra.get('audio', ''),
    'Image':        lambda card, extra: extra.get('image', ''),
}


@dataclass
class ModelEntry:
    template: CustomTemplateSchema
    model: genanki.Model
    field_names: Optional[list[str]]


def _generate_model_id() -> int:
    return random.randrange(1 << 30, 1 << 31)


def _extract_fields_from_template(qfmt: str, afmt: str) -> list[str]:
    combined = qfmt + ' ' + afmt
    seen: set[str] = set()
    fields: list[str] = []

    for m in re.finditer(r'\{\{[#/^]?(\w+)\}\}', combined):
        name = m.group(1)
        if name != 'FrontSide' and name in FIELD_VALUE_MAP and name not in seen:
            seen.add(name)
            fields.append(name)

    # {{type:FieldName}} reuses an existing field for type-in cards
    for m in re.finditer(r'\{\{type:(\w+)\}\}', combined):
        name = m.group(1)
        if name in FIELD_VALUE_MAP and name not in seen:
            seen.add(name)
            fields.append(name)

    return fields or list(FIELD_VALUE_MAP.keys())


def _build_base_model(template: CustomTemplateSchema, model_id: int) -> tuple[genanki.Model, list[str]]:
    field_names = _extract_fields_from_template(template.qfmt, template.afmt)
    model = genanki.Model(
        model_id,
        template.name,
        fields=[{'name': f} for f in field_names],
        templates=[{'name': template.name, 'qfmt': template.qfmt, 'afmt': template.afmt}],
        css=CARD_CSS,
    )
    return model, field_names


def _build_cloze_model(template: CustomTemplateSchema, model_id: int) -> genanki.Model:
    return genanki.Model(
        model_id,
        template.name,
        model_type=genanki.Model.CLOZE,
        fields=[{'name': 'Text'}, {'name': 'Extra'}, {'name': 'Audio'}],
        templates=[{'name': template.name, 'qfmt': template.qfmt, 'afmt': template.afmt}],
        css=CLOZE_CSS,
    )


def _build_model_entries(templates: list[CustomTemplateSchema]) -> list[ModelEntry]:
    entries: list[ModelEntry] = []
    for t in templates:
        mid = _generate_model_id()
        if t.is_cloze:
            entries.append(ModelEntry(template=t, model=_build_cloze_model(t, mid), field_names=None))
        else:
            model, field_names = _build_base_model(t, mid)
            entries.append(ModelEntry(template=t, model=model, field_names=field_names))
    return entries


def _prepare_media(card: CardData, media_files: list[str]) -> dict[str, str]:
    audio_field = ""
    if card.audio_path and os.path.exists(card.audio_path):
        media_files.append(card.audio_path)
        audio_field = f"[sound:{os.path.basename(card.audio_path)}]"

    image_field = ""
    if card.image_path and os.path.exists(card.image_path):
        media_files.append(card.image_path)
        img_filename = os.path.basename(card.image_path)
        image_field = f'<img src="{img_filename}" style="max-width:300px; max-height:200px;">'

    return {'audio': audio_field, 'image': image_field}


def _add_cloze_note(deck: genanki.Deck, card: CardData, model: genanki.Model, audio_field: str) -> None:
    if card.word.lower() not in card.example.lower():
        return
    cloze_text = re.compile(re.escape(card.word), re.IGNORECASE).sub(
        f"{{{{c1::{card.word}}}}}", card.example, count=1
    )
    extra_info = (
        f"<div style='text-align:left; font-size: 16px;'>"
        f"<b>{card.word}</b> ({card.partOfSpeech}) &bull; {card.phonetic}"
        f"<br><br>{card.definition}</div>"
    )
    deck.add_note(genanki.Note(model=model, fields=[cloze_text, extra_info, audio_field]))


def create_anki_package(req: DeckRequest) -> str:
    os.makedirs(req.output_dir, exist_ok=True)
    deck = genanki.Deck(_generate_model_id(), req.deck_name)
    entries = _build_model_entries(req.templates)
    media_files: list[str] = []

    for card in req.cards:
        extra = _prepare_media(card, media_files)
        for entry in entries:
            if entry.template.is_cloze:
                _add_cloze_note(deck, card, entry.model, extra['audio'])
            else:
                field_values = [FIELD_VALUE_MAP[f](card, extra) for f in entry.field_names]
                deck.add_note(genanki.Note(model=entry.model, fields=field_values))

    package = genanki.Package(deck)
    package.media_files = media_files

    out_file = os.path.join(req.output_dir, f"{req.deck_uuid}.apkg")
    package.write_to_file(out_file)
    return out_file
