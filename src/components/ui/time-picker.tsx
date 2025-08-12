import * as React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, placeholder = "Select time", className, disabled }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<number>(0);
  const [selectedMinute, setSelectedMinute] = React.useState<number>(0);

  React.useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      setSelectedHour(hours);
      setSelectedMinute(minutes);
    } else {
      const now = new Date();
      setSelectedHour(now.getHours());
      setSelectedMinute(now.getMinutes());
    }
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
    setIsOpen(false);
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const scrollToHour = (hour: number) => {
    const element = document.getElementById(`hour-${hour}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToMinute = (minute: number) => {
    const element = document.getElementById(`minute-${minute}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatTime(selectedHour, selectedMinute) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-sm">Select Time</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          
          <div className="flex gap-4">
            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-muted-foreground mb-2">Hour</div>
              <div className="relative">
                <div className="h-32 w-16 overflow-y-auto border rounded-lg bg-background scrollbar-hide">
                  <div className="py-16">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        id={`hour-${hour}`}
                        className={cn(
                          "h-8 flex items-center justify-center text-sm cursor-pointer hover:bg-accent transition-colors",
                          selectedHour === hour && "bg-primary text-primary-foreground font-medium"
                        )}
                        onClick={() => handleTimeSelect(hour, selectedMinute)}
                      >
                        {hour.toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-muted-foreground mb-2">Minute</div>
              <div className="relative">
                <div className="h-32 w-16 overflow-y-auto border rounded-lg bg-background scrollbar-hide">
                  <div className="py-16">
                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        id={`minute-${minute}`}
                        className={cn(
                          "h-8 flex items-center justify-center text-sm cursor-pointer hover:bg-accent transition-colors",
                          selectedMinute === minute && "bg-primary text-primary-foreground font-medium"
                        )}
                        onClick={() => handleTimeSelect(selectedHour, minute)}
                      >
                        {minute.toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {formatTime(selectedHour, selectedMinute)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  handleTimeSelect(now.getHours(), now.getMinutes());
                }}
                className="text-xs"
              >
                Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTimeSelect(0, 0)}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
