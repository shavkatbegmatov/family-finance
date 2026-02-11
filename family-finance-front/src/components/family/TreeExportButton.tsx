import { useState, type RefObject } from 'react';
import toast from 'react-hot-toast';
import { Download, Image, FileText, ChevronDown } from 'lucide-react';

interface TreeExportButtonProps {
  targetRef: RefObject<HTMLDivElement | null>;
  beforeExport?: () => Promise<void> | void;
}

export function TreeExportButton({ targetRef, beforeExport }: TreeExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportAs = async (format: 'png' | 'pdf') => {
    if (!targetRef.current) return;
    setExporting(true);

    try {
      await beforeExport?.();
      await new Promise(r => setTimeout(r, 200));

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = 'oila-daraxti.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const { jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const pdfWidth = 297;
        const pdfHeight = 210;

        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const w = imgWidth * ratio;
        const h = imgHeight * ratio;
        const x = (pdfWidth - w) / 2;
        const y = (pdfHeight - h) / 2;

        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', x, y, w, h);
        pdf.save('oila-daraxti.pdf');
      }
    } catch {
      toast.error('Eksport qilishda xatolik');
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="btn btn-ghost btn-sm gap-1"
        onClick={() => setOpen(!open)}
        disabled={exporting}
      >
        {exporting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Eksport
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && !exporting && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-base-100 border border-base-300 rounded-xl shadow-xl py-1.5 animate-scale-in">
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
            onClick={() => exportAs('png')}
          >
            <Image className="h-4 w-4 text-base-content/60" />
            PNG rasm
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
            onClick={() => exportAs('pdf')}
          >
            <FileText className="h-4 w-4 text-base-content/60" />
            PDF hujjat
          </button>
        </div>
      )}
    </div>
  );
}
