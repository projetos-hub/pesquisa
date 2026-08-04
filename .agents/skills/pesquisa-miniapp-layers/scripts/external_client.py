#!/usr/bin/env python3
'''External HTTPS client for Pesquisa Miniapp Layers.'''
from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

DEFAULT_API_URL = 'https://pesquisa-nu-sand.vercel.app'
TOKEN_ENV = 'PESQUISA_API_TOKEN'
URL_ENV = 'PESQUISA_API_URL'
CONFIG_ENV = 'PESQUISA_API_CONFIG'


def config_path() -> Path:
    override = os.environ.get(CONFIG_ENV, '').strip()
    if override:
        return Path(override).expanduser().resolve()
    base = Path(os.environ.get('APPDATA') or Path.home() / '.config')
    return base / 'pesquisa-miniapp-layers' / 'config.json'


def read_config() -> dict[str, Any]:
    path = config_path()
    data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    data.setdefault('api_url', DEFAULT_API_URL)
    if os.environ.get(URL_ENV):
        data['api_url'] = os.environ[URL_ENV]
    if os.environ.get(TOKEN_ENV):
        data['token'] = os.environ[TOKEN_ENV]
    return data


def save_config(data: dict[str, Any]) -> None:
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def request_json(url: str, method: str = 'GET', data: Any = None, headers: dict[str, str] | None = None) -> tuple[int, Any]:
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode('utf-8')
    request = urllib.request.Request(url, data=body, method=method, headers={'Accept': 'application/json', 'Content-Type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode('utf-8')
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode('utf-8', errors='replace')
        try:
            detail = json.loads(raw)
        except json.JSONDecodeError:
            detail = {'error': raw or str(error)}
        raise SystemExit(json.dumps({'status': error.code, 'response': detail}, ensure_ascii=False, indent=2)) from error


def authenticated_config() -> dict[str, Any]:
    config = read_config()
    config['api_url'] = str(config.get('api_url') or DEFAULT_API_URL).strip().rstrip('/')
    config['token'] = str(config.get('token') or '').strip()
    if not config['token']:
        raise SystemExit(
            f'Chave ausente. Defina {TOKEN_ENV} no ambiente ou execute setup. '
            'Nao informe a chave no chat nem como argumento de linha de comando.'
        )
    if not config['token'].startswith('pml_live_'):
        raise SystemExit(f'{TOKEN_ENV} invalida: prefixo pml_live_ esperado.')
    return config


def command_setup(args: argparse.Namespace) -> int:
    api_url = args.api_url.rstrip('/')
    _, public = request_json(f'{api_url}/api/ops/v1/config')
    email = args.email.strip().lower()
    password = getpass.getpass('Senha do painel Pesquisa: ')
    auth_url = public.get('supabaseUrl')
    publishable_key = public.get('supabasePublishableKey')
    if not auth_url or not publishable_key:
        raise SystemExit('Configuracao publica de autenticacao indisponivel.')
    token_url = f'{auth_url}/auth/v1/token?grant_type=password'
    _, session = request_json(token_url, 'POST', {'email': email, 'password': password}, {'apikey': publishable_key})
    access_token = session.get('access_token')
    if not access_token:
        raise SystemExit('Login nao retornou sessao valida.')
    _, issued = request_json(f'{api_url}/api/ops/v1/tokens', 'POST', {'name': args.name, 'expiresInDays': args.expires_days}, {'Authorization': f'Bearer {access_token}'})
    ops_token = issued.get('token')
    if not ops_token:
        raise SystemExit('API nao retornou token operacional.')
    save_config({'api_url': api_url, 'token': ops_token, 'email': email, 'token_record': issued.get('tokenRecord')})
    print(json.dumps({'ok': True, 'config': str(config_path()), 'email': email}, ensure_ascii=False, indent=2))
    return 0


def command_doctor(_args: argparse.Namespace) -> int:
    config = authenticated_config()
    headers = {'Authorization': 'Bearer ' + str(config['token'])}
    status, body = request_json(str(config['api_url']) + '/api/ops/v1/capabilities', headers=headers)
    print(json.dumps({
        'ok': status == 200,
        'api_url': config['api_url'],
        'auth_source': 'environment' if os.environ.get(TOKEN_ENV) else 'local_config',
        'email': config.get('email'),
        'capabilities': body.get('capabilities'),
    }, ensure_ascii=False, indent=2))
    return 0


def load_json_file(path: str | None, default: Any) -> Any:
    return json.loads(Path(path).read_text(encoding='utf-8-sig')) if path else default


def command_execute(args: argparse.Namespace) -> int:
    config = authenticated_config()
    data = load_json_file(args.data_file, None)
    filters = load_json_file(args.filters_file, None)
    rpc_args = load_json_file(args.args_file, None)
    payload = {
        'operation': args.operation,
        'resource': args.resource,
        'id': args.id,
        'data': data,
        'filters': filters,
        'rpc': args.rpc,
        'args': rpc_args,
        'limit': args.limit,
        'offset': args.offset,
        'dryRun': not args.apply,
    }
    payload = {key: value for key, value in payload.items() if value is not None}
    headers = {'Authorization': 'Bearer ' + str(config['token'])}
    if args.apply:
        headers['Idempotency-Key'] = args.idempotency_key or str(uuid.uuid4())
        if args.confirm:
            headers['X-Confirm-Operation'] = args.confirm
    _, body = request_json(str(config['api_url']) + '/api/ops/v1/execute', 'POST', payload, headers)
    print(json.dumps(body, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='pesquisa-miniapp-layers', description='Cliente externo da API operacional do Miniapp Layers.')
    sub = parser.add_subparsers(dest='command', required=True)

    setup = sub.add_parser('setup', help='Autenticar e emitir token pessoal revogavel.')
    setup.add_argument('--api-url', default=DEFAULT_API_URL)
    setup.add_argument('--email', required=True)
    setup.add_argument('--name', default='Codex Skill')
    setup.add_argument('--expires-days', type=int, default=180)
    setup.set_defaults(func=command_setup)

    doctor = sub.add_parser('doctor', help='Validar token e listar capacidades.')
    doctor.set_defaults(func=command_doctor)

    execute = sub.add_parser('execute', help='Executar ou simular uma operacao tipada.')
    execute.add_argument('--operation', required=True)
    execute.add_argument('--resource')
    execute.add_argument('--id')
    execute.add_argument('--data-file')
    execute.add_argument('--filters-file')
    execute.add_argument('--rpc')
    execute.add_argument('--args-file')
    execute.add_argument('--limit', type=int, default=100)
    execute.add_argument('--offset', type=int, default=0)
    execute.add_argument('--apply', action='store_true')
    execute.add_argument('--confirm')
    execute.add_argument('--idempotency-key')
    execute.set_defaults(func=command_execute)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == '__main__':
    sys.exit(main())
