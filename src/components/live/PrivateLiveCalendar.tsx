import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivateLiveRequest {
  id: string;
  creator_id: string;
  requester_id: string;
  proposed_date: string;
  proposed_duration: number;
  message: string | null;
  price: number | null;
  currency: string;
  status: string;
  creator_response: string | null;
  created_at: string;
  requester_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  creator?: {
    stage_name: string | null;
  };
}

interface PrivateLiveCalendarProps {
  requests: PrivateLiveRequest[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: Date, requests: PrivateLiveRequest[]) => void;
  selectedDate: Date | null;
}

const PrivateLiveCalendar: React.FC<PrivateLiveCalendarProps> = ({
  requests,
  currentMonth,
  onMonthChange,
  onDateClick,
  selectedDate,
}) => {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = useMemo(() => {
    const day = startOfMonth(currentMonth).getDay();
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  // Group requests by date
  const requestsByDate = useMemo(() => {
    const map = new Map<string, PrivateLiveRequest[]>();
    requests.forEach((req) => {
      const dateKey = format(new Date(req.proposed_date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(req);
    });
    return map;
  }, [requests]);

  const getDateStatus = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayRequests = requestsByDate.get(dateKey) || [];
    
    const pending = dayRequests.filter(r => r.status === 'pending').length;
    const accepted = dayRequests.filter(r => r.status === 'accepted').length;
    const paid = dayRequests.filter(r => r.status === 'paid').length;
    
    return { pending, accepted, paid, total: dayRequests.length, requests: dayRequests };
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before first day of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const { pending, accepted, paid, total, requests: dayRequests } = getDateStatus(day);
          const hasRequests = total > 0;
          const hasPending = pending > 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day, dayRequests)}
              className={cn(
                "aspect-square p-1 rounded-lg relative transition-all",
                "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                isToday(day) && "ring-2 ring-primary",
                isSelected && "bg-primary/20",
                // Grey zone for pending requests
                hasPending && "bg-muted/80 hover:bg-muted",
                // Colored for accepted/paid
                !hasPending && accepted > 0 && "bg-blue-500/20",
                !hasPending && paid > 0 && "bg-green-500/20"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday(day) && "text-primary font-bold",
                  hasPending && "text-foreground"
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Indicators */}
              {hasRequests && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {pending > 0 && (
                    <div className="w-2 h-2 rounded-full bg-yellow-500" title={`${pending} en attente`} />
                  )}
                  {accepted > 0 && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title={`${accepted} accepté(s)`} />
                  )}
                  {paid > 0 && (
                    <div className="w-2 h-2 rounded-full bg-green-500" title={`${paid} payé(s)`} />
                  )}
                </div>
              )}

              {/* Badge for count */}
              {total > 1 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
                >
                  {total}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>En attente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Accepté</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Payé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/80 border" />
          <span>Demandes à traiter</span>
        </div>
      </div>
    </div>
  );
};

export default PrivateLiveCalendar;
