import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface MonthYearPickerProps {
  value: string; // "Jan 2023" format or empty
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Parse "Jan 2023" or "January 2023" format
function parseMonthYear(value: string): { month: number | null; year: number | null } {
  if (!value) return { month: null, year: null };
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 2) return { month: null, year: null };
  
  const monthStr = parts[0];
  const yearStr = parts[1];
  
  let monthIdx = MONTHS.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  if (monthIdx === -1) {
    monthIdx = MONTH_FULL.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  }
  
  const year = parseInt(yearStr);
  if (isNaN(year)) return { month: null, year: null };
  
  return { month: monthIdx >= 0 ? monthIdx : null, year };
}

export function MonthYearPicker({ value, onChange, placeholder = "Select month", disabled = false }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsed = parseMonthYear(value);
  const selectedYear = parsed.year;
  const selectedMonth = parsed.month;
  const [viewYear, setViewYear] = useState(selectedYear ?? today.getFullYear());

  useEffect(() => {
    if (!open) return;
    
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const shadowRoot = (window as any).__careervine_shadow_root;
    const root = shadowRoot || document;
    
    const timer = setTimeout(() => {
      root.addEventListener("mousedown", handler);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      root.removeEventListener("mousedown", handler);
    };
  }, [open]);

  useEffect(() => {
    if (selectedYear !== null) {
      setViewYear(selectedYear);
    }
  }, [selectedYear]);

  const selectMonth = (monthIdx: number) => {
    onChange(`${MONTHS[monthIdx]} ${viewYear}`);
    setOpen(false);
  };

  const displayValue = value || "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`panel-input w-full text-left flex items-center justify-between gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={displayValue ? "" : "text-md-on-surface-variant opacity-70"}>
          {displayValue || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-md-on-surface-variant shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-[9999] mt-2 left-0 w-[300px] bg-white rounded-[20px] shadow-lg p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-5">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewYear(viewYear - 1); }} 
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-base font-semibold text-gray-900">{viewYear}</span>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewYear(viewYear + 1); }} 
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month grid - pill shaped buttons */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((label, idx) => {
              const sel = selectedYear === viewYear && selectedMonth === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); selectMonth(idx); }}
                  className={`h-11 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all ${
                    sel
                      ? "bg-[#2d6a30] text-white"
                      : "text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
