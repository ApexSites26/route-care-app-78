import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  company_name: string;
}

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  logo_url: null,
  primary_color: '222 47% 51%',
  company_name: 'Staff Manager',
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  refetch: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, logo_url, primary_color')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const settings: BrandingSettings = {
          company_name: data.name || defaultBranding.company_name,
          logo_url: data.logo_url,
          primary_color: data.primary_color || defaultBranding.primary_color,
        };
        setBranding(settings);
        
        // Apply primary color to CSS variable
        if (settings.primary_color) {
          document.documentElement.style.setProperty('--primary', settings.primary_color);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchBranding();
    } else {
      setLoading(false);
    }
  }, [profile?.company_id]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
