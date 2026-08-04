#!/usr/bin/env python3
'''Install Pesquisa Miniapp Layers as a user-level Codex skill.'''
from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path

SKILL_NAME = 'pesquisa-miniapp-layers'
BOOTSTRAP_NAME = 'bootstrap.json'
EXCLUDED_DIRS = {'__pycache__', '.git'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo'}


def default_skills_dir() -> Path:
    codex_home = os.environ.get('CODEX_HOME', '').strip()
    base = Path(codex_home).expanduser() if codex_home else Path.home() / '.codex'
    return base / 'skills'


def should_copy(path: Path) -> bool:
    return (
        path.name != BOOTSTRAP_NAME
        and not any(part in EXCLUDED_DIRS for part in path.parts)
        and path.suffix not in EXCLUDED_SUFFIXES
    )


def external_config_path() -> Path:
    base = Path(os.environ.get('APPDATA') or Path.home() / '.config')
    return base / SKILL_NAME / 'config.json'


def load_bootstrap(source: Path) -> dict[str, object] | None:
    path = source / BOOTSTRAP_NAME
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding='utf-8'))
    token = str(data.get('token') or '').strip()
    if not token.startswith('pml_live_'):
        raise ValueError('Bootstrap invalido: token operacional ausente.')
    return data


def save_bootstrap_config(data: dict[str, object]) -> Path:
    path = external_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return path


def install(destination_root: Path) -> tuple[Path, Path | None]:
    source = Path(__file__).resolve().parents[1]
    destination = destination_root.expanduser().resolve() / SKILL_NAME
    bootstrap = load_bootstrap(source)
    if source == destination:
        config = save_bootstrap_config(bootstrap) if bootstrap else None
        if bootstrap:
            (source / BOOTSTRAP_NAME).unlink()
        return destination, config

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
    config = save_bootstrap_config(bootstrap) if bootstrap else None
    if bootstrap:
        (source / BOOTSTRAP_NAME).unlink()
    return destination, config


def main() -> int:
    parser = argparse.ArgumentParser(description='Instalar a skill no perfil do usuario, independente do repositorio.')
    parser.add_argument('--skills-dir', type=Path, default=default_skills_dir())
    args = parser.parse_args()
    destination, config = install(args.skills_dir)
    client = destination / 'scripts' / 'external_client.py'
    print(f'Skill instalada em: {destination}')
    print(f'Cliente: python {client} doctor')
    if config:
        print(f'Autenticacao preconfigurada em: {config}')
        print('Bootstrap removido da pasta extraida. Exclua tambem o ZIP original apos instalar.')
    else:
        print('Autenticacao: defina PESQUISA_API_TOKEN no ambiente ou execute setup.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
