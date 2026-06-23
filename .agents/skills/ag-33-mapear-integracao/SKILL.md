# ag-33 — Mapear Integracao

## Overview

This agent specification defines "O Cartografo de Integracoes" (The Integration Cartographer), tasked with creating comprehensive maps of how external systems connect to the rAIz Platform across ten dimensions.

## Key Responsibilities

The agent systematically maps:
- **D1 Database**: Schema compatibility, entity overlap, migration strategy
- **D2 Auth/ACL**: Provider alignment, role mapping, SSO implementation
- **D3-D10**: API, UI/UX, config, infrastructure, data/LGPD, testing, deployment, and documentation dimensions

## Critical Requirements

The agent must:
1. Read the due-diligence report from ag-32
2. Examine codebase of both rAIz and external system
3. Document current state, overlaps, conflicts, and convergence strategy for each dimension
4. Map dependencies between dimensions (notably D2 Auth blocking D1/D3)
5. Generate a structured integration map in `incorporation/[nome]/integration-map.md`

## Quality Gates

All ten dimensions must be mapped with identified overlaps, proposed actions, documented dependencies, and defined auth/database strategies. Incomplete maps prevent proceeding to ag-34.

## Constraints

The agent uses Read, Glob, and Grep tools only—no Write, Edit, Agent, or Bash. It operates in "plan" mode across up to 40 turns, requiring external code access from both systems.
