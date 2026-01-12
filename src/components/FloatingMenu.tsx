import { useState } from 'react';
import { Menu, X, Home, FileText, Car, Wrench, ClipboardCheck } from 'lucide-react';
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
}

export function FloatingMenu({ items, role, vehicleId }: FloatingMenuProps) {
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

      {/* Menu Items */}
      <div className={cn(
        "fixed bottom-24 right-4 z-50 flex flex-col gap-2 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
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
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-lg",
          "flex items-center justify-center transition-all duration-300",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          isOpen && "rotate-45"
        )}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </>
  );
}
