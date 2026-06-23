# ag-35 — Incorporar Modulo

## Overview

This document describes "The Integrator" agent that executes module incorporation into the rAIz Platform following a structured roadmap. The agent implements Anti-Corruption Layers (ACL), database migrations, synchronization, and UI adapters while maintaining system stability.

## Key Responsibilities

The agent manages module-by-module integration through:

- **Task tracking** via TaskCreate/TaskUpdate with phase-based progress
- **Pre-flight verification** of branches, feature flags, and task plans
- **Implementation patterns** including ACL adapters, feature flags, and migrations

## Critical Protocols

**ACL Pattern**: External systems connect through adapter interfaces that translate between external and rAIz data models, preventing core system contamination.

**Feature Flags**: "All incorporation code must be behind feature flags" with fallback to original rAIz behavior when disabled.

**Migrations**: Database changes use null-safe column additions, indexing for Row-Level Security, and mandatory rollback scripts.

## Execution Rules

- One phase per execution cycle
- Checkpoint commits every 5 tasks; roadmap review every 10
- All tests must pass before advancing phases
- Zero regression permitted in core rAIz functionality

## Constraints

The agent explicitly cannot modify core rAIz code without ACL wrappers, skip task plan items, or deploy untested migrations. Violations of these rules trigger a stop condition.
