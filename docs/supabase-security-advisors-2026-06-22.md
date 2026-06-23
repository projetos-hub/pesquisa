# Supabase Security Advisors - 2026-06-22

Command:

```bash
npx supabase db advisors --linked --type security --level warn --fail-on none --output-format json
```

## Findings

| Finding | Level | Object | Local remediation |
| --- | --- | --- | --- |
| `anon_security_definer_function_executable` | WARN | `rpc_nps_breakdown` | `20260622203022_harden_report_rpc_grants.sql` revokes `PUBLIC`, `anon`, `authenticated`. |
| `authenticated_security_definer_function_executable` | WARN | `rpc_nps_breakdown` | Same as above. |
| `anon_security_definer_function_executable` | WARN | `rpc_scale_averages` | `20260622203022_harden_report_rpc_grants.sql` revokes `PUBLIC`, `anon`, `authenticated`. |
| `authenticated_security_definer_function_executable` | WARN | `rpc_scale_averages` | Same as above. |
| `anon_security_definer_function_executable` | WARN | `trigger_dispatch_processor` | `20260622210319_harden_comunicados_and_cron_rpc.sql` revokes `PUBLIC`, `anon`, `authenticated`. |
| `authenticated_security_definer_function_executable` | WARN | `trigger_dispatch_processor` | Same as above. |
| `rls_disabled_in_public` | ERROR | `comunicados` | `20260622210319_harden_comunicados_and_cron_rpc.sql` enables RLS and allows only published/approved public SELECT. |
| `function_search_path_mutable` | WARN | `trigger_dispatch_processor` | `20260622210319_harden_comunicados_and_cron_rpc.sql` sets fixed search_path. |
| `function_search_path_mutable` | WARN | `update_comunicados_updated_at` | `20260622210319_harden_comunicados_and_cron_rpc.sql` sets fixed search_path. |
| `function_search_path_mutable` | WARN | `update_updated_at_column` | `20260622210319_harden_comunicados_and_cron_rpc.sql` sets fixed search_path. |
| `rls_policy_always_true` | WARN | `response_sessions_public_insert`, `responses_public_insert` | Still open by design for public survey submit; should be revisited in Phase 3 submit hardening. |
| `auth_leaked_password_protection` | WARN | Supabase Auth | Dashboard setting; not fixable by repo migration. |

## Notes

- Advisors were run against the linked remote database before applying the new migrations, so the listed RPC/RLS findings are expected to remain visible remotely until migrations are applied.
- Admin report/export/analytics APIs now call `requireAdmin()`, which checks `admin_profiles` before using the service role.
- Direct RPC execution is hardened via grants; API access is hardened in application code.

