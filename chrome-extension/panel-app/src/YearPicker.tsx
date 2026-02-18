import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface YearPickerProps {
  value: string; // "2023" format or empty
  onChange: (value: string) => void;
  placeholder?: string;
}

export function YearPicker({ value, onChange, placeholder = "Select year" }: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selectedYear = value ? parseInt(value) : null;
  const [viewDecade, setViewDecade] = useState(
    selectedYear ? Math.floor(selectedYear / 10) * 10 : Math.floor(today.getFullYear() / 10) * 10
  );

  useEffect(() => {
    if (!open) return;
    
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    // Use the shadow root if available, otherwise document
    const shadowRoot = (window as any).__careervine_shadow_root;
    const root = shadowRoot || document;
    
    // Small delay to avoid immediate close
    const timer = setTimeout(() => {
      root.addEventListener("mousedown", handler);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      root.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const years = Array.from({ length: 12 }, (_, i) => viewDecade - 1 + i);

  const selectYear = (year: number) => {
    onChange(String(year));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="panel-input w-full text-left flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className={value ? "" : "text-md-on-surface-variant opacity-70"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-md-on-surface-variant shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-[9999] mt-2 left-0 w-[300px] bg-white rounded-[20px] shadow-lg p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          {/* Decade navigation */}
          <div className="flex items-center justify-between mb-5">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewDecade(viewDecade - 10); }} 
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-base font-semibold text-gray-900">{viewDecade}s</span>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setViewDecade(viewDecade + 10); }} 
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Year grid - pill shaped buttons */}
          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => {
              const sel = selectedYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); selectYear(year); }}
                  className={`h-11 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all ${
                    sel
                      ? "bg-[#2d6a30] text-white"
                      : "text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
