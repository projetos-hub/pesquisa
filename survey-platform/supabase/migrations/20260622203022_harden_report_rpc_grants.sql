-- Harden report RPC grants.
--
-- The report routes authenticate the admin in Next.js and call these RPCs with
-- the service role. Direct execution by any authenticated user would expose PII
-- across arbitrary survey_ids because the functions are SECURITY DEFINER.

REVOKE EXECUTE ON FUNCTION public.rpc_nps_breakdown(
  UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_scale_averages(
  UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_nps_breakdown(
  UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.rpc_scale_averages(
  UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) TO service_role;
