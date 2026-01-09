import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
}

interface CompanyContextType {
  company: Company | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  loading: true,
  refetch: async () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCompany(data as Company);
        
        // Apply primary color to CSS variable
        if (data.primary_color) {
          document.documentElement.style.setProperty('--primary', data.primary_color);
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchCompany();
    } else {
      setLoading(false);
    }
  }, [profile?.company_id]);

  return (
    <CompanyContext.Provider value={{ company, loading, refetch: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
