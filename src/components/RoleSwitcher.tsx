import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Car, Users, Shield, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type AppRole = 'driver' | 'escort' | 'manager';

const roleConfig: Record<AppRole, { icon: typeof Car; label: string; path: string; color: string }> = {
  driver: { icon: Car, label: 'Driver', path: '/driver', color: 'text-amber-600' },
  escort: { icon: Users, label: 'Escort', path: '/escort', color: 'text-indigo-600' },
  manager: { icon: Shield, label: 'Manager', path: '/manager', color: 'text-primary' },
};

export function RoleSwitcher() {
  const { roles, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  // Only show if user has multiple roles
  if (roles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = (role: AppRole) => {
    setActiveRole(role);
    navigate(roleConfig[role].path);
  };

  const currentRole = activeRole || roles[0];
  const CurrentIcon = roleConfig[currentRole]?.icon || Car;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className={`w-4 h-4 ${roleConfig[currentRole]?.color}`} />
          <span className="capitalize hidden sm:inline">{currentRole}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const config = roleConfig[role];
          const isActive = role === currentRole;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={`gap-2 cursor-pointer ${isActive ? 'bg-accent' : ''}`}
            >
              <config.icon className={`w-4 h-4 ${config.color}`} />
              <span className="capitalize">{config.label}</span>
              {isActive && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
