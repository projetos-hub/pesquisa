# ag-31 — Revisar Ortografia

## Overview

This spelling and grammar checker tool corrects orthographic and accentuation errors in Portuguese Brazilian (PT-BR) and English documents across multiple formats.

## Key Features

**Supported Formats**: PPTX, DOCX, PDF, TXT, MD

**Three-tier Backend System**:
- LanguageTool API (grammar + spelling, 25+ languages)
- phunspell (offline Hunspell dictionary)
- pyspellchecker (Levenshtein distance algorithm)

The system automatically cascades through backends if one fails.

## Core Workflow

The tool follows four mandatory phases:

1. **Text Extraction** — Retrieves content from document structure
2. **Language Detection** — Analyzes first 20 text samples to identify PT vs EN
3. **Verification & Correction** — Applies fixes silently without user confirmation
4. **Reporting** — Generates summary of corrections made

## Silent Correction Behavior

The system applies corrections automatically while maintaining safety guardrails: never corrects acronyms (<=6 character ALL-CAPS), protects proper nouns via ignore list, and preserves code/formulas.

## Integration Points

- **ag-29 (Document Generation)**: Automatically invoked after PPTX/DOCX creation
- **ag-21 (Project Documentation)**: Optional markdown correction

## Common PT-BR Corrections

Examples include: *não* (not), *você* (you), *também* (also), *gestão* (management) — primarily accent restoration and grammatical disambiguation.
