import os
import requests
import pandas as pd
import time
from datetime import datetime
import io

# Configurações
LAYERS_API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYXV0aDphcHAiLCJkYXRlIjoiMjAyNi0wMy0xMVQxOTozNzoxNS4yMjFaIiwiYXBwSWQiOiJtM2p6cTVzMDBiIiwiaWF0IjoxNzczMjU3ODM1fQ.naFmaITu4ySyufs5g3-Q9RN1ba012Mlw4vdgl7-ireE" # Token recuperado de .env.local
CSV_URL = "https://docs.google.com/spreadsheets/d/1_z8qtXcZQ_4fJKNZCfoaWELckYiQVrqhuwmtTr9lMbM/export?format=csv"
SCHEDULE_DATE = "2026-05-09T13:00:00-03:00"

TEXT_BODY = """O Dia da Família foi preparado com muito carinho para receber vocês em um momento especial de acolhimento, convivência e aproximação entre escola e família.
Foi uma alegria compartilhar esse encontro com cada um de vocês e vivenciar momentos de afeto, participação e integração junto aos nossos alunos.
A presença de vocês tornou esse dia ainda mais significativo. Para que possamos aprimorar os próximos encontros, gostaríamos de contar com sua opinião.

✨ Sua resposta é essencial para seguirmos construindo experiências significativas junto com vocês!
Atenciosamente,
Equipe Matriz."""

PUSH_TITLE = "Pesquisa de Satisfação – Dia da Família"
PUSH_BODY = "Sua opinião é essencial! Toque para responder a pesquisa do Dia da Família."

COMMUNITY_MAPPING = {
    "ROCHA MIRANDA": "matriz-rochamiranda",
    "CAMPO GRANDE": "matriz-campogrande",
    "TAQUARA": "matriz-taquara",
    "BANGU": "matriz-bangu",
    "NOVA IGUACU": "matriz-novaiguacu",
    "DUQUE DE CAXIAS": "matriz-caxias",
    "MADUREIRA": "matriz-madureira",
    "RETIRO DOS ARTISTAS": "matriz-retirodosartistas",
    "SÃO JOÃO DE MERITI": "matriz-saojoaodemeriti",
    "TIJUCA": "matriz-tijuca"
}

def get_community_id(filial_name):
    for key, cid in COMMUNITY_MAPPING.items():
        if key in filial_name.upper():
            return cid
    return None

def send_notification(community_id, rAs):
    url = "https://api.layers.digital/v2/notification/send"
    headers = {
        "Authorization": f"Bearer {LAYERS_API_TOKEN}",
        "community-id": community_id,
        "Content-Type": "application/json"
    }
    
    # Criar tópicos por RA
    topics = [{"kind": "member", "alias": ra} for ra in rAs]
    
    payload = {
        "targets": {
            "topics": topics,
            "roles": ["guardian"]
        },
        "title": PUSH_TITLE,
        "body": TEXT_BODY.split('\n')[0], # Resumo para o preview
        "action": {
            "type": "portal",
            "portalAlias": "@raizeducacao:pesquisa",
            "path": "/"
        },
        "scheduleDate": SCHEDULE_DATE,
        "channels": {
            "pushNotification": {
                "title": PUSH_TITLE,
                "body": PUSH_BODY
            },
            "email": {
                "title": PUSH_TITLE,
                "body": TEXT_BODY.replace('\n', '<br>'),
                "actionLabel": "Responder Pesquisa"
            }
        }
    }
    
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code == 200:
        print(f"  [OK] {len(rAs)} notificações agendadas para {community_id}")
    else:
        print(f"  [ERRO] {community_id}: {resp.status_code} - {resp.text}")

def main():
    print(f"Baixando base de RAs...")
    resp = requests.get(CSV_URL)
    resp.raise_for_status()
    
    df = pd.read_csv(io.StringIO(resp.text))
    print(f"Total de registros: {len(df)}")
    
    # Agrupar por comunidade
    dispatches = {}
    for _, row in df.iterrows():
        ra = str(row['RA']).strip()
        filial = str(row['FILIAL']).strip()
        
        cid = get_community_id(filial)
        if not cid:
            print(f"  [AVISO] Filial não mapeada: {filial}")
            continue
            
        if cid not in dispatches:
            dispatches[cid] = []
        dispatches[cid].append(ra)
    
    print("\nResumo do agendamento:")
    for cid, ras in dispatches.items():
        print(f"  - {cid}: {len(ras)} RAs")
    
    # Enviar em lotes de 100 por comunidade para evitar payloads gigantes
    print("\nIniciando disparos...")
    for cid, ras in dispatches.items():
        for i in range(0, len(ras), 100):
            batch = ras[i:i+100]
            send_notification(cid, batch)
            time.sleep(1) # Delay amigável

if __name__ == "__main__":
    main()
