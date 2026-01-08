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

// Convert hex to HSL
const hexToHsl = (hex: string): string | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Convert HSL string to hex
const hslToHex = (hsl: string): string => {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#3b82f6';
  
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function BrandingSettings() {
  const { branding, refetch } = useBranding();
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [hexColor, setHexColor] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(branding.company_name);
    setPrimaryColor(branding.primary_color);
    setHexColor(hslToHex(branding.primary_color));
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
    setHexColor(hslToHex(color));
    document.documentElement.style.setProperty('--primary', color);
  };

  const handleHexChange = (hex: string) => {
    setHexColor(hex);
    if (hex.match(/^#[0-9A-Fa-f]{6}$/)) {
      const hsl = hexToHsl(hex);
      if (hsl) {
        setPrimaryColor(hsl);
        document.documentElement.style.setProperty('--primary', hsl);
      }
    }
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
          
          {/* Hex Input */}
          <div className="flex gap-2 items-center">
            <div 
              className="w-10 h-10 rounded-lg border-2 border-border"
              style={{ backgroundColor: `hsl(${primaryColor})` }}
            />
            <Input
              value={hexColor}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#3b82f6"
              className="font-mono"
              maxLength={7}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">Enter a hex code or choose a preset below</p>
          
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
