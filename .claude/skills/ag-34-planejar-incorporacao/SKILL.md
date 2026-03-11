# ag-34 — Planejar Incorporacao

This document defines Claude Code's agent for transforming integration maps into executable incorporation roadmaps. Here are the key elements:

**Core Purpose**: The agent acts as a PMO (Project Management Office) that converts integration assessments into phased roadmaps with milestones, atomic tasks, and feature flags.

**Key Outputs**:
- Phased roadmap with clear milestones
- Task plans decomposed into atomic work items
- Feature flags for granular control
- Risk registers and rollback procedures

**Phase Structure**: The roadmap progresses through levels (L1-L5), typically including:
- Coexistence (both systems run with shared auth)
- Federation (data flows, unified ACL)
- Unification and Simbiosis (higher integration levels as needed)

**Critical Constraints**:
- "Each phase must be deployable" with feature flags enabling safe toggles
- Rollback plans must precede forward planning
- Big bang approaches are explicitly prohibited
- Zero impact on core systems through adapters and ACLs

**Quality Gates**: The planning succeeds only if it includes verifiable completion criteria, risk identification (minimum 5 risks), clear dependencies, and decomposed atomic tasks.

The agent integrates with upstream assessment work (ag-32, ag-33) and downstream execution (ag-35).
