#!/usr/bin/env python3
'''Install Pesquisa Miniapp Layers as a user-level Codex skill.'''
from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

SKILL_NAME = 'pesquisa-miniapp-layers'
EXCLUDED_DIRS = {'__pycache__', '.git'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo'}


def default_skills_dir() -> Path:
    codex_home = os.environ.get('CODEX_HOME', '').strip()
    base = Path(codex_home).expanduser() if codex_home else Path.home() / '.codex'
    return base / 'skills'


def should_copy(path: Path) -> bool:
    return not any(part in EXCLUDED_DIRS for part in path.parts) and path.suffix not in EXCLUDED_SUFFIXES


def install(destination_root: Path) -> Path:
    source = Path(__file__).resolve().parents[1]
    destination = destination_root.expanduser().resolve() / SKILL_NAME
    if source == destination:
        return destination

    destination.mkdir(parents=True, exist_ok=True)
    for item in source.rglob('*'):
        relative = item.relative_to(source)
        if not should_copy(relative):
            continue
        target = destination / relative
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description='Instalar a skill no perfil do usuario, independente do repositorio.')
    parser.add_argument('--skills-dir', type=Path, default=default_skills_dir())
    args = parser.parse_args()
    destination = install(args.skills_dir)
    client = destination / 'scripts' / 'external_client.py'
    print(f'Skill instalada em: {destination}')
    print(f'Cliente: python {client} doctor')
    print('Autenticacao: defina PESQUISA_API_TOKEN no ambiente ou execute setup.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
