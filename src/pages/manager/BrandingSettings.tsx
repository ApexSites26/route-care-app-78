import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Palette, Building2, Check } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

const colorPresets = [
  { name: 'Blue', value: '222 47% 51%' },
  { name: 'Green', value: '142 71% 45%' },
  { name: 'Purple', value: '262 83% 58%' },
  { name: 'Orange', value: '25 95% 53%' },
  { name: 'Red', value: '0 72% 51%' },
  { name: 'Teal', value: '174 72% 40%' },
  { name: 'Pink', value: '330 81% 60%' },
  { name: 'Indigo', value: '239 84% 67%' },
];

export default function BrandingSettings() {
  const { branding, refetch } = useBranding();
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(branding.company_name);
    setPrimaryColor(branding.primary_color);
    setLogoUrl(branding.logo_url);
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success('Logo uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          setting_value: {
            logo_url: logoUrl,
            primary_color: primaryColor,
            company_name: companyName,
          },
        })
        .eq('setting_key', 'branding');

      if (error) throw error;

      // Apply color immediately
      document.documentElement.style.setProperty('--primary', primaryColor);
      
      await refetch();
      toast.success('Branding saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleColorSelect = (color: string) => {
    setPrimaryColor(color);
    // Preview the color
    document.documentElement.style.setProperty('--primary', color);
  };

  return (
    <MobileLayout title="Branding Settings">
      <div className="space-y-6 animate-fade-in">
        {/* Preview Card */}
        <div className="touch-card bg-primary/10 border-2 border-primary/20">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-foreground">{companyName || 'Your Company'}</h3>
              <p className="text-sm text-muted-foreground">Preview of your branding</p>
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company Name
          </Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Company Logo
          </Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Current logo" className="w-20 h-20 object-contain rounded-lg border bg-white p-2" />
            )}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">Max 2MB, PNG or JPG recommended</p>
            </div>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Primary Colour
          </Label>
          <div className="grid grid-cols-4 gap-3">
            {colorPresets.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorSelect(color.value)}
                className={`relative w-full aspect-square rounded-xl transition-transform hover:scale-105 ${
                  primaryColor === color.value ? 'ring-2 ring-offset-2 ring-foreground' : ''
                }`}
                style={{ backgroundColor: `hsl(${color.value})` }}
                title={color.name}
              >
                {primaryColor === color.value && (
                  <Check className="absolute inset-0 m-auto w-6 h-6 text-white drop-shadow-lg" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </MobileLayout>
  );
}
