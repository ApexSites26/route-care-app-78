import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, FileText, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: string;
  user_id: string;
  user_role: string;
  action: string;
  table_name: string;
  record_id: string | null;
  details: any;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export default function AuditLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    async function fetchData() {
      if (!profile?.company_id) return;

      // Fetch logs
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      setLogs(logsData || []);

      // Fetch profiles for user names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('company_id', profile.company_id);

      const profileMap = new Map<string, string>();
      (profilesData || []).forEach((p: Profile) => {
        profileMap.set(p.user_id, p.full_name);
      });
      setProfiles(profileMap);

      setLoading(false);
    }

    fetchData();
  }, [profile?.company_id, page]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      profiles.get(log.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || log.user_role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTableName = (table: string) => {
    return table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <MobileLayout title="Audit Logs">
      <div className="space-y-4 animate-fade-in">
        <p className="text-sm text-muted-foreground">
          Immutable record of all submissions and changes for compliance.
        </p>

        {/* Filters */}
        <div className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="escort">Escort</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No audit logs found</p>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="touch-card space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{profiles.get(log.user_id) || 'Unknown'}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{log.user_role}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-primary font-medium">{formatAction(log.action)}</span>
                  <span className="text-muted-foreground">on</span>
                  <span>{formatTableName(log.table_name)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                </div>

                {Object.keys(log.details).length > 0 && (
                  <div className="text-xs bg-muted/50 p-2 rounded">
                    {Object.entries(log.details).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-2">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < pageSize}
          >
            Next
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
