import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  company_name: 'School Taxi',
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  refetch: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'branding')
        .single();

      if (error) throw error;
      
      if (data?.setting_value) {
        const settings = data.setting_value as unknown as BrandingSettings;
        setBranding(settings);
        
        // Apply primary color to CSS variable
        document.documentElement.style.setProperty('--primary', settings.primary_color);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
