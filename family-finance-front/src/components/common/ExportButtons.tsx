import { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, FileDown, Download } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Standardized export buttons for Excel and PDF.
 * Mobile: single "Eksport" button with dropdown.
 * Desktop: separate Excel and PDF buttons.
 */
export function ExportButtons({
  onExportExcel,
  onExportPdf,
  disabled = false,
  loading = false,
}: ExportButtonsProps) {
  const isDisabled = disabled || loading;
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  if (isMobile) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isDisabled}
        >
          <Download className="h-4 w-4" />
          Eksport
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-base-300 bg-base-100 p-1 shadow-xl">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-base-200"
              onClick={() => { onExportExcel(); setDropdownOpen(false); }}
            >
              <FileSpreadsheet className="h-4 w-4 text-success" />
              Excel
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-base-200"
              onClick={() => { onExportPdf(); setDropdownOpen(false); }}
            >
              <FileDown className="h-4 w-4 text-error" />
              PDF
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        className="btn btn-success btn-sm flex-1 sm:flex-none"
        onClick={onExportExcel}
        disabled={isDisabled}
        title="Excel formatida eksport"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </button>
      <button
        className="btn btn-error btn-sm flex-1 sm:flex-none"
        onClick={onExportPdf}
        disabled={isDisabled}
        title="PDF formatida eksport"
      >
        <FileDown className="h-4 w-4" />
        PDF
      </button>
    </>
  );
}
