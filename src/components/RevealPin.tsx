import { useState, useRef, useCallback } from 'react';
import { CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RevealPinProps {
  pin: string | null;
}

export function RevealPin({ pin }: RevealPinProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const HOLD_DURATION = 1500; // 1.5 seconds to reveal
  const PROGRESS_INTERVAL = 50;

  const startHold = useCallback(() => {
    if (!pin) return;
    
    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, PROGRESS_INTERVAL);

    holdTimerRef.current = setTimeout(() => {
      setIsRevealed(true);
      setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, HOLD_DURATION);
  }, [pin]);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
    setIsRevealed(false);
  }, []);

  if (!pin) {
    return (
      <div className="touch-card">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Fuel Card PIN</h3>
        </div>
        <p className="text-muted-foreground text-sm">No fuel card PIN assigned. Contact your manager.</p>
      </div>
    );
  }

  return (
    <div className="touch-card">
      <div className="flex items-center gap-3 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Fuel Card PIN</h3>
      </div>
      
      <div className="relative">
        <Button
          variant="outline"
          className={cn(
            "w-full h-14 relative overflow-hidden transition-all select-none",
            isRevealed && "bg-primary/10 border-primary"
          )}
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onTouchCancel={endHold}
        >
          {/* Progress bar background */}
          <div 
            className="absolute inset-0 bg-primary/20 transition-all"
            style={{ width: `${progress}%` }}
          />
          
          <div className="relative z-10 flex items-center justify-center gap-3">
            {isRevealed ? (
              <>
                <Eye className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold tracking-[0.5em] text-primary">{pin}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5" />
                <span className="text-muted-foreground">Hold to reveal PIN</span>
              </>
            )}
          </div>
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {isRevealed ? 'Release to hide' : 'Press and hold for 1.5 seconds'}
      </p>
    </div>
  );
}