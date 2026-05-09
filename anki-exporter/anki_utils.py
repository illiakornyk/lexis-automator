from __future__ import annotations

import re
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import genanki

from schemas import CardData, CustomTemplateSchema, DeckRequest
from card_styles import CARD_CSS, CLOZE_CSS

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

CLOZE_FIELDS: list[str] = ['Text', 'Extra', 'Audio', 'Image']


@dataclass
class ModelEntry:
    template: CustomTemplateSchema
    model: genanki.Model
    field_names: list[str] | None


def _generate_model_id() -> int:
    return secrets.randbelow((1 << 31) - (1 << 30)) + (1 << 30)


# Matches {{Field}}, {{#Field}}, {{^Field}}, and any number of `filter:` modifiers
# (e.g. {{type:Field}}, {{cloze:Field}}, {{tts en_US:Field}}).
TEMPLATE_FIELD_RE = re.compile(r'\{\{[#/^]?(?:[^{}:]+:)*(\w+)\}\}')


def _extract_fields_from_template(qfmt: str, afmt: str) -> list[str]:
    combined = qfmt + ' ' + afmt
    seen: set[str] = set()
    fields: list[str] = []

    for m in TEMPLATE_FIELD_RE.finditer(combined):
        name = m.group(1)
        if name != 'FrontSide' and name in FIELD_VALUE_MAP and name not in seen:
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
        fields=[{'name': f} for f in CLOZE_FIELDS],
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


def _prepare_media(card: CardData) -> tuple[dict[str, str], list[str]]:
    collected: list[str] = []

    audio_field = ""
    if card.audio_path and Path(card.audio_path).exists():
        collected.append(card.audio_path)
        audio_field = f"[sound:{Path(card.audio_path).name}]"

    image_field = ""
    if card.image_path and Path(card.image_path).exists():
        collected.append(card.image_path)
        image_field = f'<img src="{Path(card.image_path).name}" class="card-image">'

    return {'audio': audio_field, 'image': image_field}, collected


def _add_cloze_note(deck: genanki.Deck, card: CardData, model: genanki.Model, extra: dict[str, str]) -> None:
    pattern = re.compile(rf'\b{re.escape(card.word)}\b', re.IGNORECASE)
    if not pattern.search(card.example):
        return
    cloze_text = pattern.sub(f"{{{{c1::{card.word}}}}}", card.example, count=1)
    extra_info = (
        f"<div class='definition'>"
        f"<span class='word'>{card.word}</span> "
        f"<span class='part-of-speech'>{card.partOfSpeech}</span> "
        f"<span class='phonetic'>{card.phonetic}</span>"
        f"<br><br>{card.definition}</div>"
    )
    fields = [cloze_text, extra_info, extra.get('audio', ''), extra.get('image', '')]
    deck.add_note(genanki.Note(model=model, fields=fields))


def create_anki_package(req: DeckRequest) -> str:
    output_dir = Path(req.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    deck = genanki.Deck(_generate_model_id(), req.deck_name)
    entries = _build_model_entries(req.templates)
    media_files: list[str] = []

    for card in req.cards:
        extra, card_media = _prepare_media(card)
        media_files.extend(card_media)
        for entry in entries:
            if entry.template.is_cloze:
                _add_cloze_note(deck, card, entry.model, extra)
            else:
                field_values = [FIELD_VALUE_MAP[f](card, extra) for f in entry.field_names]
                deck.add_note(genanki.Note(model=entry.model, fields=field_values))

    package = genanki.Package(deck)
    package.media_files = media_files

    out_file = output_dir / f"{req.deck_uuid}.apkg"
    package.write_to_file(str(out_file))
    return str(out_file)
