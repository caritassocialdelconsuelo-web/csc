GRANT EXECUTE ON FUNCTION public.admin_execute_dynamic_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_execute_dynamic_sql(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_provision_slap_table(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_provision_slap_table(TEXT) TO service_role;
