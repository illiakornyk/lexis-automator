from __future__ import annotations

CARD_CSS = """
.card {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    text-align: center;
    color: #1e293b;
    background-color: #ffffff;
    padding: 28px 24px;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.5;
}

/* ── Word ── */
.word {
    font-size: 2.2em;
    font-weight: 800;
    color: #312e81;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    line-height: 1.2;
}

/* ── Part of speech + phonetic (inline, centered) ── */
.part-of-speech {
    display: inline-block;
    font-size: 0.75em;
    font-style: italic;
    color: #4f46e5;
    background-color: #eef2ff;
    border-radius: 20px;
    padding: 3px 10px;
    margin: 0 4px 10px 0;
    vertical-align: middle;
}

.phonetic {
    font-size: 0.85em;
    color: #64748b;
    letter-spacing: 0.04em;
    vertical-align: middle;
    margin-bottom: 10px;
    display: inline-block;
}

/* ── Definition ── */
.definition {
    font-size: 1em;
    color: #334155;
    line-height: 1.7;
    background: #f8fafc;
    border-left: 3px solid #4f46e5;
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    margin: 16px 0;
    text-align: left;
}

/* ── Example ── */
.example {
    font-size: 0.95em;
    color: #64748b;
    font-style: italic;
    border-left: 3px solid #e2e8f0;
    border-radius: 0 6px 6px 0;
    padding: 10px 16px;
    margin: 12px 0;
    text-align: left;
    line-height: 1.7;
}

/* ── Image ── */
.card-image-container {
    margin: 20px 0;
    text-align: center;
}

.card-image-wrap {
    display: inline-block;
    margin: 0 auto;
}

.card-image {
    max-width: 300px;
    max-height: 200px;
    border-radius: 10px;
    display: block;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.10);
}

.card-image-credit {
    font-size: 10px;
    color: #9ca3af;
    text-align: right;
    margin-top: 4px;
}

/* ── Audio ── */
.card-audio {
    margin: 20px 0;
    text-align: center;
}

/* ── Type-in input ── */
.card-type-in {
    margin: 20px 0;
    text-align: center;
}

/* ── Divider ── */
.card-hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 20px 0;
}

/* ── Night mode ── */
.nightMode .card {
    background-color: #0f172a;
    color: #f1f5f9;
}

.nightMode .word { color: #818cf8; }
.nightMode .part-of-speech { color: #a5b4fc; background-color: #1e1b4b; }
.nightMode .phonetic { color: #94a3b8; }
.nightMode .definition { color: #e2e8f0; background: #1e293b; border-left-color: #818cf8; }
.nightMode .example { color: #94a3b8; border-left-color: #334155; }
.nightMode .card-hr { border-top-color: #334155; }
"""

CLOZE_CSS = CARD_CSS + """
.cloze {
    font-weight: 700;
    color: #4f46e5;
    border-bottom: 2px solid #4f46e5;
}

.nightMode .cloze { color: #818cf8; border-bottom-color: #818cf8; }
"""
