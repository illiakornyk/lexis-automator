from __future__ import annotations

CARD_CSS = """
.card {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 20px;
    text-align: center;
    color: #1a1a1a;
    background-color: #fafafa;
    padding: 24px;
    max-width: 600px;
    margin: 0 auto;
}

.word {
    font-size: 28px;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 4px;
}

.phonetic {
    font-size: 16px;
    color: #6b7280;
    margin-bottom: 12px;
}

.part-of-speech {
    display: inline-block;
    font-size: 13px;
    font-style: italic;
    color: #ffffff;
    background-color: #6b7280;
    border-radius: 4px;
    padding: 2px 8px;
    margin-bottom: 16px;
}

.definition {
    font-size: 18px;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 16px;
}

.example {
    font-size: 16px;
    color: #4b5563;
    font-style: italic;
    border-left: 3px solid #2563eb;
    padding-left: 12px;
    text-align: left;
    margin: 0 auto;
    max-width: 480px;
}

.card-image {
    max-width: 300px;
    max-height: 200px;
    border-radius: 8px;
    margin: 12px auto;
    display: block;
}

.nightMode .card {
    background-color: #1f2937;
    color: #f3f4f6;
}

.nightMode .word { color: #60a5fa; }
.nightMode .definition { color: #d1d5db; }
.nightMode .example { color: #9ca3af; border-left-color: #60a5fa; }
"""

CLOZE_CSS = CARD_CSS + """
.cloze {
    font-weight: 700;
    color: #2563eb;
    border-bottom: 2px solid #2563eb;
}

.nightMode .cloze { color: #60a5fa; border-bottom-color: #60a5fa; }
"""
