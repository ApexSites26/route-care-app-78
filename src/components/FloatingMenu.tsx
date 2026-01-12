import { useState } from 'react';
import { Menu, X, LogOut, ClipboardCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MenuItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface FloatingMenuProps {
  items: MenuItem[];
  role: 'driver' | 'escort';
  vehicleId?: string;
  onLogout: () => void;
}

export function FloatingMenu({ items, role, vehicleId, onLogout }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={handleClose}
        />
      )}

      {/* Menu Items - positioned from top */}
      <div className={cn(
        "fixed top-16 right-4 z-50 flex flex-col gap-2 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        {items.map((item, index) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200",
                "bg-card border border-border hover:bg-accent",
                isActive && "bg-primary text-primary-foreground border-primary"
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: isOpen ? 'slide-in 0.2s ease-out forwards' : undefined 
              }}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Inspection Mode - Only for drivers with assigned vehicle */}
        {role === 'driver' && vehicleId && (
          <Link
            to={`/driver/inspection`}
            onClick={handleClose}
            className="flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200 bg-accent text-accent-foreground border border-accent hover:bg-accent/80"
          >
            <ClipboardCheck className="w-5 h-5" />
            <span className="font-medium text-sm whitespace-nowrap">Inspection</span>
          </Link>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            handleClose();
            onLogout();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200 bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm whitespace-nowrap">Logout</span>
        </button>
      </div>

      {/* Menu Button - in header area */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-10 h-10 rounded-lg",
          "flex items-center justify-center transition-all duration-300",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          isOpen && "bg-muted text-foreground"
        )}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );
}
