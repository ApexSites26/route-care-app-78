import { useState, useEffect, useMemo } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks } from 'date-fns';
import { Loader2, Download, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const vehicleCheckLabels: Record<string, string> = {
  check_leaks: 'Leaks',
  check_tyres_wheels: 'Tyres',
  check_mirrors: 'Mirrors',
  check_lights: 'Lights',
  check_indicators: 'Indicators',
  check_wipers_washers: 'Wipers',
  check_windows: 'Windows',
  check_horn: 'Horn',
  check_no_excess_smoke: 'Smoke',
  check_brakes: 'Brakes',
  check_body_damage: 'Damage',
  check_fluids: 'Fluids',
  check_first_aid_kit: 'First Aid',
  check_cleanliness: 'Clean',
  check_hackney_plate: 'Plate',
  check_defects_reported: 'Defects',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Calculate hours between two time strings (HH:MM:SS or HH:MM format)
const calculateHours = (start: string | null, finish: string | null): number => {
  if (!start || !finish) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [finishH, finishM] = finish.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const finishMins = finishH * 60 + finishM;
  return Math.max(0, (finishMins - startMins) / 60);
};

// Format hours as "Xh Ym"
const formatHours = (hours: number): string => {
  if (hours === 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export default function ViewEntries() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [driverEntries, setDriverEntries] = useState<any[]>([]);
  const [escortEntries, setEscortEntries] = useState<any[]>([]);
  const [additionalRuns, setAdditionalRuns] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { contracted_hours: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDates = DAYS.map((_, i) => addDays(weekStart, i));
  const selectedDate = format(weekDates[selectedDay], 'yyyy-MM-dd');

  const fetchEntries = async () => {
    setLoading(true);
    
    const startDate = format(weekStart, 'yyyy-MM-dd');
    const endDate = format(weekEnd, 'yyyy-MM-dd');
    
    // Fetch all entries for the week including additional runs
    const [{ data: driverData }, { data: escortData }, { data: additionalData }] = await Promise.all([
      supabase
        .from('driver_entries')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate),
      supabase
        .from('escort_entries')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate),
      supabase
        .from('additional_runs')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate),
    ]);

    setAdditionalRuns(additionalData || []);

    // Fetch profiles and vehicles
    const driverUserIds = [...new Set(driverData?.map(d => d.user_id) || [])];
    const escortUserIds = [...new Set(escortData?.map(e => e.user_id) || [])];
    const additionalUserIds = [...new Set(additionalData?.map(a => a.user_id) || [])];
    const vehicleIds = [...new Set(driverData?.map(d => d.vehicle_id).filter(Boolean) || [])];

    const allUserIds = [...new Set([...driverUserIds, ...escortUserIds, ...additionalUserIds])];
    
    const [{ data: allProfiles }, { data: vehicles }] = await Promise.all([
      allUserIds.length > 0 
        ? supabase.from('profiles').select('user_id, full_name, contracted_hours').in('user_id', allUserIds)
        : Promise.resolve({ data: [] }),
      vehicleIds.length > 0 
        ? supabase.from('vehicles').select('id, registration').in('id', vehicleIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((allProfiles || []).map(p => [p.user_id, p.full_name]));
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, v.registration]));
    const contractedMap = new Map((allProfiles || []).map(p => [p.user_id, { contracted_hours: p.contracted_hours || 40 }]));
    setProfilesMap(contractedMap);

    // Calculate additional hours per user per date
    const additionalHoursMap = new Map<string, number>();
    (additionalData || []).forEach(run => {
      const key = `${run.user_id}-${run.entry_date}`;
      const hours = calculateHours(run.start_time, run.finish_time);
      additionalHoursMap.set(key, (additionalHoursMap.get(key) || 0) + hours);
    });

    const enrichedDriverEntries = (driverData || []).map(e => {
      const morningHours = calculateHours(e.morning_start_time, e.morning_finish_time);
      const afternoonHours = calculateHours(e.afternoon_start_time, e.afternoon_finish_time);
      const additionalHours = additionalHoursMap.get(`${e.user_id}-${e.entry_date}`) || 0;
      return {
        ...e,
        driver_name: profileMap.get(e.user_id) || 'Unknown',
        vehicle_registration: vehicleMap.get(e.vehicle_id) || null,
        daily_hours: morningHours + afternoonHours + additionalHours,
        additional_hours: additionalHours,
      };
    });

    const enrichedEscortEntries = (escortData || []).map(e => {
      const morningHours = calculateHours(e.morning_start_time, e.morning_finish_time);
      const afternoonHours = calculateHours(e.afternoon_start_time, e.afternoon_finish_time);
      const additionalHours = additionalHoursMap.get(`${e.user_id}-${e.entry_date}`) || 0;
      return {
        ...e,
        escort_name: profileMap.get(e.user_id) || 'Unknown',
        daily_hours: morningHours + afternoonHours + additionalHours,
        additional_hours: additionalHours,
      };
    });

    setDriverEntries(enrichedDriverEntries);
    setEscortEntries(enrichedEscortEntries);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [weekStart]);

  // Filter entries by search query
  const filterBySearch = (entries: any[], nameKey: string) => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e => e[nameKey]?.toLowerCase().includes(query));
  };

  // Get entries for selected day (filtered)
  const dayDriverEntries = useMemo(() => 
    filterBySearch(driverEntries.filter(e => e.entry_date === selectedDate), 'driver_name'),
    [driverEntries, selectedDate, searchQuery]
  );
  const dayEscortEntries = useMemo(() => 
    filterBySearch(escortEntries.filter(e => e.entry_date === selectedDate), 'escort_name'),
    [escortEntries, selectedDate, searchQuery]
  );

  // Calculate weekly totals per user (filtered)
  const filteredDriverEntries = useMemo(() => filterBySearch(driverEntries, 'driver_name'), [driverEntries, searchQuery]);
  const filteredEscortEntries = useMemo(() => filterBySearch(escortEntries, 'escort_name'), [escortEntries, searchQuery]);

  const driverWeeklyTotals = filteredDriverEntries.reduce((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] || 0) + e.daily_hours;
    return acc;
  }, {} as Record<string, number>);

  const escortWeeklyTotals = filteredEscortEntries.reduce((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] || 0) + e.daily_hours;
    return acc;
  }, {} as Record<string, number>);

  // Get unique users for weekly summary (filtered)
  const uniqueDrivers = [...new Map(filteredDriverEntries.map(e => [e.user_id, { user_id: e.user_id, name: e.driver_name }])).values()];
  const uniqueEscorts = [...new Map(filteredEscortEntries.map(e => [e.user_id, { user_id: e.user_id, name: e.escort_name }])).values()];

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Timesheet for Payroll (simple format for Excel/Google Sheets)
  const exportTimesheetPayroll = () => {
    const headers = ['Staff Type', 'Name', 'Date', 'Morning Start', 'Morning Finish', 'Afternoon Start', 'Afternoon Finish', 'Daily Hours', 'Contracted Hours', 'Overtime'];
    const rows = [
      ...driverEntries.map(e => {
        const contracted = profilesMap.get(e.user_id)?.contracted_hours || 40;
        return [
          'Driver',
          e.driver_name,
          e.entry_date,
          e.morning_start_time?.slice(0, 5) || '',
          e.morning_finish_time?.slice(0, 5) || '',
          e.afternoon_start_time?.slice(0, 5) || '',
          e.afternoon_finish_time?.slice(0, 5) || '',
          e.daily_hours.toFixed(2),
          contracted,
          '',
        ];
      }),
      ...escortEntries.map(e => {
        const contracted = profilesMap.get(e.user_id)?.contracted_hours || 40;
        return [
          'Escort',
          e.escort_name,
          e.entry_date,
          e.morning_start_time?.slice(0, 5) || '',
          e.morning_finish_time?.slice(0, 5) || '',
          e.afternoon_start_time?.slice(0, 5) || '',
          e.afternoon_finish_time?.slice(0, 5) || '',
          e.daily_hours.toFixed(2),
          contracted,
          '',
        ];
      }),
    ];

    // Add weekly summary rows
    rows.push([]);
    rows.push(['--- Weekly Summary ---']);
    rows.push(['Staff Type', 'Name', '', '', '', '', '', 'Total Hours', 'Contracted', 'Overtime']);
    
    uniqueDrivers.forEach(d => {
      const weeklyHours = driverWeeklyTotals[d.user_id] || 0;
      const contracted = profilesMap.get(d.user_id)?.contracted_hours || 40;
      const overtime = Math.max(0, weeklyHours - contracted);
      rows.push(['Driver', d.name, '', '', '', '', '', weeklyHours.toFixed(2), contracted.toString(), overtime.toFixed(2)]);
    });
    
    uniqueEscorts.forEach(e => {
      const weeklyHours = escortWeeklyTotals[e.user_id] || 0;
      const contracted = profilesMap.get(e.user_id)?.contracted_hours || 40;
      const overtime = Math.max(0, weeklyHours - contracted);
      rows.push(['Escort', e.name, '', '', '', '', '', weeklyHours.toFixed(2), contracted.toString(), overtime.toFixed(2)]);
    });

    const csv = [headers, ...rows].map(r => 
      Array.isArray(r) ? r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') : r
    ).join('\n');
    downloadFile(csv, `timesheet-payroll-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  // Export Detailed Compliance Report
  const exportComplianceReport = () => {
    const checkKeys = Object.keys(vehicleCheckLabels);
    const headers = ['Staff Type', 'Name', 'Date', 'Vehicle', 'Start Mileage', 'End Mileage', 'Issues Reported', ...checkKeys.map(k => vehicleCheckLabels[k]), 'Additional Comments'];
    const rows = driverEntries.map(e => [
      'Driver',
      e.driver_name,
      e.entry_date,
      e.vehicle_registration || '',
      e.start_mileage || '',
      e.end_mileage || '',
      e.no_issues ? 'None' : e.issues_text || '',
      ...checkKeys.map(k => e[k] === true ? 'Pass' : e[k] === false ? 'Fail' : 'N/A'),
      e.additional_comments || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `compliance-report-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  // Export All Data (Full export)
  const exportFullData = () => {
    const checkKeys = Object.keys(vehicleCheckLabels);
    const headers = ['Type', 'Name', 'Date', 'Morning Start', 'Morning Finish', 'Afternoon Start', 'Afternoon Finish', 'Daily Hours', 'Start Mileage', 'End Mileage', 'Issues', 'Vehicle', ...checkKeys.map(k => vehicleCheckLabels[k]), 'Additional Comments'];
    const rows = [
      ...driverEntries.map(e => [
        'Driver',
        e.driver_name,
        e.entry_date,
        e.morning_start_time?.slice(0, 5) || '',
        e.morning_finish_time?.slice(0, 5) || '',
        e.afternoon_start_time?.slice(0, 5) || '',
        e.afternoon_finish_time?.slice(0, 5) || '',
        e.daily_hours.toFixed(2),
        e.start_mileage || '',
        e.end_mileage || '',
        e.no_issues ? 'None' : e.issues_text || '',
        e.vehicle_registration || '',
        ...checkKeys.map(k => e[k] ? 'Pass' : e[k] === false ? 'Fail' : 'N/A'),
        e.additional_comments || '',
      ]),
      ...escortEntries.map(e => [
        'Escort',
        e.escort_name,
        e.entry_date,
        e.morning_start_time?.slice(0, 5) || '',
        e.morning_finish_time?.slice(0, 5) || '',
        e.afternoon_start_time?.slice(0, 5) || '',
        e.afternoon_finish_time?.slice(0, 5) || '',
        e.daily_hours.toFixed(2),
        '',
        '',
        e.no_issues ? 'None' : e.issues_text || '',
        '',
        ...checkKeys.map(() => ''),
        '',
      ]),
    ];
    
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `full-entries-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  const Check = ({ v }: { v: boolean | null }) => v === true 
    ? <CheckCircle2 className="w-4 h-4 text-success" /> 
    : v === false 
    ? <XCircle className="w-4 h-4 text-destructive" />
    : <span className="text-muted-foreground text-xs">-</span>;

  const toggleExpand = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  return (
    <MobileLayout title="View Entries">
      <div className="space-y-4 animate-fade-in">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-sm">
            {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Selector */}
        <div className="flex gap-1">
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={cn(
                'flex-1 py-2 text-xs rounded-lg font-medium transition-colors',
                selectedDay === i 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <div>{day}</div>
              <div className="text-[10px] opacity-75">{format(weekDates[i], 'd')}</div>
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Spreadsheet
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportTimesheetPayroll}>
                <Download className="w-4 h-4 mr-2" />
                Timesheet for Payroll
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportComplianceReport}>
                <Download className="w-4 h-4 mr-2" />
                Compliance Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportFullData}>
                <Download className="w-4 h-4 mr-2" />
                Full Data Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                CSV files open in Excel & Google Sheets
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList className="w-full">
            <TabsTrigger value="drivers" className="flex-1">Drivers</TabsTrigger>
            <TabsTrigger value="escorts" className="flex-1">Escorts</TabsTrigger>
            <TabsTrigger value="summary" className="flex-1">Weekly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="drivers" className="mt-4">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : dayDriverEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries for {format(weekDates[selectedDay], 'EEEE d MMM')}</p>
            ) : (
              <div className="space-y-3">
                {dayDriverEntries.map(e => (
                  <div key={e.id} className="touch-card space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{e.driver_name}</p>
                        <p className="text-sm text-muted-foreground">{e.vehicle_registration || 'No vehicle'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{formatHours(e.daily_hours)}</span>
                        {!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}
                        <button onClick={() => toggleExpand(e.id)} className="p-1">
                          {expandedEntry === e.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5) || '-'} - {e.morning_finish_time?.slice(0,5) || '-'}</div>
                      <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5) || '-'} - {e.afternoon_finish_time?.slice(0,5) || '-'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Start:</span> {e.start_mileage || '-'} mi</div>
                      <div><span className="text-muted-foreground">End:</span> {e.end_mileage || '-'} mi</div>
                    </div>

                    {e.additional_hours > 0 && (
                      <div className="text-sm bg-accent/10 px-2 py-1 rounded">
                        <span className="text-muted-foreground">Extra runs:</span> +{formatHours(e.additional_hours)}
                      </div>
                    )}

                    {expandedEntry === e.id && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {Object.entries(vehicleCheckLabels).map(([key, label]) => (
                            <span key={key} className="flex items-center gap-1">
                              {label} <Check v={e[key]} />
                            </span>
                          ))}
                        </div>
                        
                        {e.additional_comments && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Comments:</span>
                            <p className="mt-1">{e.additional_comments}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="escorts" className="mt-4">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : dayEscortEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries for {format(weekDates[selectedDay], 'EEEE d MMM')}</p>
            ) : (
              <div className="space-y-3">
                {dayEscortEntries.map(e => (
                  <div key={e.id} className="touch-card space-y-2">
                    <div className="flex justify-between">
                      <p className="font-semibold">{e.escort_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{formatHours(e.daily_hours)}</span>
                        {!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5) || '-'} - {e.morning_finish_time?.slice(0,5) || '-'}</div>
                      <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5) || '-'} - {e.afternoon_finish_time?.slice(0,5) || '-'}</div>
                    </div>
                    {e.additional_hours > 0 && (
                      <div className="text-sm bg-accent/10 px-2 py-1 rounded">
                        <span className="text-muted-foreground">Extra runs:</span> +{formatHours(e.additional_hours)}
                      </div>
                    )}
                    {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <div className="space-y-4">
                {/* Drivers Weekly Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Drivers</h3>
                  {uniqueDrivers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No driver entries this week</p>
                  ) : (
                    <div className="space-y-2">
                      {uniqueDrivers.map(d => {
                        const userEntries = driverEntries.filter(e => e.user_id === d.user_id);
                        const weeklyHours = driverWeeklyTotals[d.user_id] || 0;
                        const contracted = profilesMap.get(d.user_id)?.contracted_hours || 40;
                        const overtime = Math.max(0, weeklyHours - contracted);
                        return (
                          <div key={d.user_id} className="touch-card">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-medium">{d.name}</p>
                                <div className="flex gap-2 text-xs mt-1">
                                  <span className="text-muted-foreground">Contracted: {contracted}h</span>
                                  <span className={cn(
                                    "font-semibold",
                                    overtime > 0 ? "text-warning" : "text-muted-foreground"
                                  )}>
                                    OT: {overtime > 0 ? formatHours(overtime) : '0'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-primary font-semibold">{formatHours(weeklyHours)}</span>
                            </div>
                            <div className="flex gap-1 text-xs">
                              {DAYS.map((day, i) => {
                                const dayDate = format(weekDates[i], 'yyyy-MM-dd');
                                const dayEntry = userEntries.find(e => e.entry_date === dayDate);
                                return (
                                  <div key={day} className="flex-1 text-center py-1 bg-muted rounded">
                                    <div className="text-muted-foreground">{day}</div>
                                    <div className="font-medium">{dayEntry ? formatHours(dayEntry.daily_hours) : '-'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Escorts Weekly Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Escorts</h3>
                  {uniqueEscorts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No escort entries this week</p>
                  ) : (
                    <div className="space-y-2">
                      {uniqueEscorts.map(e => {
                        const userEntries = escortEntries.filter(entry => entry.user_id === e.user_id);
                        const weeklyHours = escortWeeklyTotals[e.user_id] || 0;
                        const contracted = profilesMap.get(e.user_id)?.contracted_hours || 40;
                        const overtime = Math.max(0, weeklyHours - contracted);
                        return (
                          <div key={e.user_id} className="touch-card">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-medium">{e.name}</p>
                                <div className="flex gap-2 text-xs mt-1">
                                  <span className="text-muted-foreground">Contracted: {contracted}h</span>
                                  <span className={cn(
                                    "font-semibold",
                                    overtime > 0 ? "text-warning" : "text-muted-foreground"
                                  )}>
                                    OT: {overtime > 0 ? formatHours(overtime) : '0'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-primary font-semibold">{formatHours(weeklyHours)}</span>
                            </div>
                            <div className="flex gap-1 text-xs">
                              {DAYS.map((day, i) => {
                                const dayDate = format(weekDates[i], 'yyyy-MM-dd');
                                const dayEntry = userEntries.find(entry => entry.entry_date === dayDate);
                                return (
                                  <div key={day} className="flex-1 text-center py-1 bg-muted rounded">
                                    <div className="text-muted-foreground">{day}</div>
                                    <div className="font-medium">{dayEntry ? formatHours(dayEntry.daily_hours) : '-'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
