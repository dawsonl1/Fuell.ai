/**
 * M3 Dialog / Modal component
 *
 * Follows Material Design 3 dialog specs:
 *   - Scrim overlay at 32 % opacity
 *   - surface-container-high background
 *   - 28 px corner radius (M3 extra-large shape)
 *   - Headline in on-surface, body in on-surface-variant
 */

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* M3 Scrim */}
      <div
        className="absolute inset-0 bg-black/32"
        onClick={onClose}
      />

      {/* Dialog surface */}
      <div className={`relative w-full ${sizeClasses[size]} bg-surface-container-high rounded-[28px] shadow-lg max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Headline */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-[22px] leading-7 font-normal text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="state-layer p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
