import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAuditLog() {
  const { user, profile } = useAuth();

  const logAction = async (
    action: string,
    tableName: string,
    recordId?: string,
    details?: Record<string, any>
  ) => {
    if (!user || !profile?.company_id) return;

    try {
      await supabase.from('audit_logs').insert({
        company_id: profile.company_id,
        user_id: user.id,
        user_role: profile.role,
        action,
        table_name: tableName,
        record_id: recordId || null,
        details: details || {},
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
}
