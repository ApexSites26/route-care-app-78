import { useRunExceptions } from '@/hooks/useRunExceptions';
import { AlertTriangle, Bell } from 'lucide-react';
import { format, addDays } from 'date-fns';

export function ExceptionNotifications() {
  const { upcomingNotifications, loading } = useRunExceptions();

  if (loading || upcomingNotifications.length === 0) {
    return null;
  }

  const tomorrow = format(addDays(new Date(), 1), 'EEEE, d MMM');

  return (
    <div className="touch-card border-warning/30 bg-warning/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-warning/20">
          <Bell className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Schedule Changes Tomorrow</h3>
          <p className="text-sm text-muted-foreground">{tomorrow}</p>
        </div>
      </div>

      <div className="space-y-2">
        {upcomingNotifications.map((notification, index) => (
          <div 
            key={index}
            className="flex items-start gap-2 p-2 rounded-md bg-background border border-warning/20"
          >
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">
                <span className="text-primary">{notification.runCode}</span>
                <span className="mx-1">·</span>
                <span className="text-muted-foreground">{notification.leg}</span>
                <span className="mx-1">→</span>
                <span className="font-bold text-warning">{notification.time}</span>
              </p>
              {notification.note && (
                <p className="text-muted-foreground text-xs mt-0.5">{notification.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
