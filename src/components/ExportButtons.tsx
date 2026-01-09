import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface ExportButtonsProps {
  driverEntries: any[];
  escortEntries: any[];
  weekStart: Date;
  weekEnd: Date;
}

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

const formatHours = (hours: number): string => {
  if (hours === 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export function ExportButtons({ driverEntries, escortEntries, weekStart, weekEnd }: ExportButtonsProps) {
  
  const exportPayrollCSV = () => {
    const headers = ['Staff Type', 'Name', 'Date', 'Morning Start', 'Morning Finish', 'Afternoon Start', 'Afternoon Finish', 'Daily Hours'];
    const rows = [
      ...driverEntries.map(e => [
        'Driver', 
        e.driver_name, 
        e.entry_date, 
        e.morning_start_time?.slice(0,5) || '', 
        e.morning_finish_time?.slice(0,5) || '', 
        e.afternoon_start_time?.slice(0,5) || '', 
        e.afternoon_finish_time?.slice(0,5) || '', 
        formatHours(e.daily_hours),
      ]),
      ...escortEntries.map(e => [
        'Escort', 
        e.escort_name, 
        e.entry_date, 
        e.morning_start_time?.slice(0,5) || '', 
        e.morning_finish_time?.slice(0,5) || '', 
        e.afternoon_start_time?.slice(0,5) || '', 
        e.afternoon_finish_time?.slice(0,5) || '', 
        formatHours(e.daily_hours),
      ]),
    ];
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadFile(csv, `payroll-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  const exportComplianceCSV = () => {
    const checkKeys = Object.keys(vehicleCheckLabels);
    const headers = ['Staff Type', 'Name', 'Date', 'Vehicle', 'Start Mileage', 'End Mileage', 'Issues', ...checkKeys.map(k => vehicleCheckLabels[k]), 'Additional Comments'];
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
    downloadFile(csv, `compliance-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  const exportIssuesCSV = () => {
    const headers = ['Staff Type', 'Name', 'Date', 'Issue Description'];
    const rows = [
      ...driverEntries.filter(e => !e.no_issues).map(e => [
        'Driver', 
        e.driver_name, 
        e.entry_date, 
        e.issues_text || '',
      ]),
      ...escortEntries.filter(e => !e.no_issues).map(e => [
        'Escort', 
        e.escort_name, 
        e.entry_date, 
        e.issues_text || '',
      ]),
    ];
    
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `issues-${format(weekStart, 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Export Options</p>
      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" size="sm" onClick={exportPayrollCSV} className="justify-start">
          <Download className="w-4 h-4 mr-2" />
          Export for Payroll (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={exportComplianceCSV} className="justify-start">
          <Download className="w-4 h-4 mr-2" />
          Export for Council / Compliance (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={exportIssuesCSV} className="justify-start">
          <Download className="w-4 h-4 mr-2" />
          Export Issue Reports (CSV)
        </Button>
      </div>
    </div>
  );
}
