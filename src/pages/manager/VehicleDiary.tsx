import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths } from 'date-fns';
import { 
  Loader2, Car, User, Wrench, AlertTriangle, Building2, 
  Calendar, Download, Eye, CheckCircle2, Clock, Filter, Link, Copy, ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
}

interface DiaryEntry {
  type: 'driver_usage' | 'garage_visit' | 'workshop' | 'defect';
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  details?: string;
  status?: 'resolved' | 'pending' | 'in_workshop' | 'returned';
  metadata?: Record<string, any>;
}

interface DriverHistory {
  id: string;
  driver_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  driver?: { full_name: string };
}

export default function VehicleDiary() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [driverHistory, setDriverHistory] = useState<DriverHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inspectionMode, setInspectionMode] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [inspectionLinkDialogOpen, setInspectionLinkDialogOpen] = useState(false);
  const [inspectionLink, setInspectionLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    async function fetchVehicles() {
      if (!profile?.company_id) return;
      
      const { data } = await supabase
        .from('vehicles')
        .select('id, registration, make, model')
        .eq('company_id', profile.company_id)
        .order('registration');
      
      setVehicles(data || []);
      setLoading(false);
    }
    
    fetchVehicles();
  }, [profile?.company_id]);

  const fetchDiaryEntries = async () => {
    if (!selectedVehicle || !profile?.company_id) return;
    
    setLoadingEntries(true);
    const entries: DiaryEntry[] = [];
    
    // Fetch driver history
    const { data: history } = await supabase
      .from('vehicle_driver_history')
      .select('*, driver:profiles!vehicle_driver_history_driver_id_fkey(full_name)')
      .eq('vehicle_id', selectedVehicle)
      .gte('assigned_at', dateFrom)
      .lte('assigned_at', dateTo + 'T23:59:59')
      .order('assigned_at', { ascending: false });
    
    setDriverHistory(history || []);
    
    (history || []).forEach(h => {
      entries.push({
        type: 'driver_usage',
        id: h.id,
        date: new Date(h.assigned_at),
        title: `Driver: ${h.driver?.full_name}`,
        subtitle: h.unassigned_at 
          ? `${format(new Date(h.assigned_at), 'dd/MM/yy')} - ${format(new Date(h.unassigned_at), 'dd/MM/yy')}`
          : `From ${format(new Date(h.assigned_at), 'dd/MM/yy')} (Current)`,
        status: h.unassigned_at ? undefined : 'pending',
      });
    });
    
    // Fetch garage visits
    const { data: visits } = await supabase
      .from('garage_visits')
      .select('*, driver:profiles!garage_visits_driver_id_fkey(full_name)')
      .eq('vehicle_id', selectedVehicle)
      .gte('visit_date', dateFrom)
      .lte('visit_date', dateTo)
      .order('visit_date', { ascending: false });
    
    (visits || []).forEach(v => {
      const reasonLabels: Record<string, string> = {
        bulb_replacement: 'Bulb Replacement',
        fluid_topup: 'Fluid Top-up',
        tyre_check: 'Tyre Check',
        other: 'Other',
      };
      entries.push({
        type: 'garage_visit',
        id: v.id,
        date: new Date(v.visit_date),
        title: `Garage Visit: ${reasonLabels[v.reason_type] || v.reason_type}`,
        subtitle: `By ${v.driver?.full_name}`,
        details: v.notes,
        metadata: { mileage: v.mileage },
      });
    });
    
    // Fetch workshop records
    const { data: workshop } = await supabase
      .from('workshop_records')
      .select('*')
      .eq('vehicle_id', selectedVehicle)
      .gte('date_left', dateFrom)
      .lte('date_left', dateTo + 'T23:59:59')
      .order('date_left', { ascending: false });
    
    (workshop || []).forEach(w => {
      entries.push({
        type: 'workshop',
        id: w.id,
        date: new Date(w.date_left),
        title: `Workshop: ${w.garage_name}`,
        subtitle: w.date_returned 
          ? `${format(new Date(w.date_left), 'dd/MM/yy')} - ${format(new Date(w.date_returned), 'dd/MM/yy')}`
          : `From ${format(new Date(w.date_left), 'dd/MM/yy')}`,
        details: w.work_carried_out,
        status: w.date_returned ? 'returned' : 'in_workshop',
      });
    });
    
    // Fetch defects
    const { data: defects } = await supabase
      .from('vehicle_defects')
      .select('*, reporter:profiles!vehicle_defects_reported_by_fkey(full_name)')
      .eq('vehicle_id', selectedVehicle)
      .gte('date_identified', dateFrom)
      .lte('date_identified', dateTo)
      .order('date_identified', { ascending: false });
    
    (defects || []).forEach(d => {
      entries.push({
        type: 'defect',
        id: d.id,
        date: new Date(d.date_identified),
        title: 'Defect Reported',
        subtitle: `By ${d.reporter?.full_name}`,
        details: d.defect_description,
        status: d.is_resolved ? 'resolved' : 'pending',
        metadata: { action_taken: d.action_taken, date_corrected: d.date_corrected },
      });
    });
    
    // Sort all entries by date
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    setDiaryEntries(entries);
    setLoadingEntries(false);
  };

  useEffect(() => {
    if (selectedVehicle) {
      fetchDiaryEntries();
    }
  }, [selectedVehicle, dateFrom, dateTo]);

  const filteredEntries = activeFilter === 'all' 
    ? diaryEntries 
    : diaryEntries.filter(e => e.type === activeFilter);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'driver_usage': return <User className="w-4 h-4" />;
      case 'garage_visit': return <Wrench className="w-4 h-4" />;
      case 'workshop': return <Building2 className="w-4 h-4" />;
      case 'defect': return <AlertTriangle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'driver_usage': return 'bg-blue-500';
      case 'garage_visit': return 'bg-amber-500';
      case 'workshop': return 'bg-purple-500';
      case 'defect': return 'bg-destructive';
      default: return 'bg-primary';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const variants: Record<string, { class: string; label: string }> = {
      resolved: { class: 'bg-success/10 text-success', label: 'Resolved' },
      pending: { class: 'bg-warning/10 text-warning', label: 'Open' },
      in_workshop: { class: 'bg-amber-500/10 text-amber-500', label: 'In Workshop' },
      returned: { class: 'bg-success/10 text-success', label: 'Returned' },
    };
    const v = variants[status];
    return v ? <Badge className={v.class}>{v.label}</Badge> : null;
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    
    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Title', 'Subtitle', 'Details', 'Status'];
      const rows = filteredEntries.map(e => [
        e.date.toISOString(),
        e.type,
        e.title,
        e.subtitle || '',
        e.details || '',
        e.status || '',
      ]);
      
      const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle-diary-${vehicle?.registration}-${dateFrom}-${dateTo}.csv`;
      a.click();
      
      toast({ title: 'Export complete', description: 'CSV file downloaded.' });
    } else {
      toast({ title: 'PDF Export', description: 'PDF export coming soon. Please use CSV for now.' });
    }
    
    setExportDialogOpen(false);
  };

  const generateInspectionLink = async () => {
    if (!selectedVehicle || !profile?.company_id) return;
    
    setGeneratingLink(true);
    
    try {
      // Check for existing active link
      const { data: existing } = await supabase
        .from('vehicle_inspection_links')
        .select('access_token')
        .eq('vehicle_id', selectedVehicle)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existing) {
        const link = `${window.location.origin}/inspect?token=${existing.access_token}`;
        setInspectionLink(link);
      } else {
        // Create new link
        const { data: newLink, error } = await supabase
          .from('vehicle_inspection_links')
          .insert({
            vehicle_id: selectedVehicle,
            company_id: profile.company_id,
          })
          .select('access_token')
          .single();
        
        if (error) throw error;
        
        const link = `${window.location.origin}/inspect?token=${newLink.access_token}`;
        setInspectionLink(link);
      }
      
      setInspectionLinkDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    
    setGeneratingLink(false);
  };

  const copyInspectionLink = () => {
    if (!inspectionLink) return;
    navigator.clipboard.writeText(inspectionLink);
    toast({ title: 'Copied!', description: 'Inspection link copied to clipboard.' });
  };

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  
  // Compliance check
  const hasOpenDefects = diaryEntries.some(e => e.type === 'defect' && e.status === 'pending');
  const hasVehicleInWorkshop = diaryEntries.some(e => e.type === 'workshop' && e.status === 'in_workshop');

  return (
    <MobileLayout title="Vehicle Diary">
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-2">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.registration} {v.make && v.model && `- ${v.make} ${v.model}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVehicleData && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-bold text-primary text-lg tracking-wider">{selectedVehicleData.registration}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVehicleData.make} {selectedVehicleData.model}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {!hasOpenDefects && !hasVehicleInWorkshop ? (
                  <Badge className="bg-success/10 text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Compliance Ready
                  </Badge>
                ) : (
                  <Badge className="bg-warning/10 text-warning flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {hasOpenDefects ? 'Open Defects' : 'In Workshop'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={inspectionMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => setInspectionMode(!inspectionMode)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {inspectionMode ? 'Exit' : 'Preview'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateInspectionLink}
                disabled={generatingLink}
              >
                {generatingLink ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Link className="w-4 h-4 mr-1" />}
                Share Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'driver_usage', label: 'Drivers' },
                { key: 'garage_visit', label: 'Garage' },
                { key: 'workshop', label: 'Workshop' },
                { key: 'defect', label: 'Defects' },
              ].map(f => (
                <Button 
                  key={f.key}
                  variant={activeFilter === f.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(f.key)}
                  className="shrink-0"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {loadingEntries ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
            ) : filteredEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries found for selected period</p>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry, idx) => (
                  <div 
                    key={entry.id} 
                    className={`touch-card relative ${inspectionMode ? 'border-2' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full ${getEntryColor(entry.type)} text-white flex items-center justify-center shrink-0`}>
                        {getEntryIcon(entry.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-foreground">{entry.title}</p>
                          {getStatusBadge(entry.status)}
                        </div>
                        
                        {entry.subtitle && (
                          <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
                        )}
                        
                        {entry.details && (
                          <p className="text-sm text-foreground mt-1">{entry.details}</p>
                        )}
                        
                        {entry.metadata?.mileage && (
                          <p className="text-xs text-muted-foreground mt-1">Mileage: {entry.metadata.mileage}</p>
                        )}
                        
                        {entry.metadata?.action_taken && (
                          <p className="text-xs text-success mt-1">✓ {entry.metadata.action_taken}</p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(entry.date, 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        )}

        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Vehicle Diary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Export diary for {selectedVehicleData?.registration} from {dateFrom} to {dateTo}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleExport('csv')} variant="outline" className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-1" />
                  CSV
                </Button>
                <Button onClick={() => handleExport('pdf')} variant="outline" className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-1" />
                  PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inspection Link Dialog */}
        <Dialog open={inspectionLinkDialogOpen} onOpenChange={setInspectionLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-primary" />
                Inspection Link
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Share this link with licensing officers or police for read-only access to the vehicle diary.
                No login required.
              </p>
              
              <div className="flex gap-2">
                <Input 
                  value={inspectionLink || ''} 
                  readOnly 
                  className="flex-1 text-xs"
                />
                <Button onClick={copyInspectionLink} variant="outline" size="icon">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(inspectionLink || '', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Link
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                This link works offline once cached and shows the last 12 months of records.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
