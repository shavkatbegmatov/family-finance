import { Modal } from './Modal';
import { changelogData } from '../../data/changelog';
import { Gift, Zap, Bug } from 'lucide-react';

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-primary">
                    <Gift className="h-6 w-6" />
                    <span>Nima yangiliklar?</span>
                </div>
            }
            size="lg"
        >
            <div className="flex flex-col gap-8 py-2">
                {changelogData.map((entry, index) => (
                    <div key={entry.version} className="relative">
                        {/* Timeline connector */}
                        {index !== changelogData.length - 1 && (
                            <div className="absolute left-4 top-10 bottom-[-32px] w-px bg-base-200" />
                        )}

                        <div className="flex items-start gap-4">
                            <div className="mt-1 sticky top-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-base-100 z-10">
                                <span className="text-xs font-bold leading-none">{entry.version.split('.')[1]}</span>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <h3 className="text-lg font-bold">v{entry.version} \u2014 {entry.title}</h3>
                                    <span className="text-sm font-medium text-base-content/50 px-2 py-0.5 rounded-full bg-base-200 w-fit">
                                        {entry.date}
                                    </span>
                                </div>

                                {entry.features.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                                            <Zap className="h-4 w-4" />
                                            Yangi imkoniyatlar
                                        </div>
                                        <ul className="space-y-1.5 ml-1 border-l-2 border-secondary/20 pl-4 py-1">
                                            {entry.features.map((feature, i) => (
                                                <li key={i} className="text-sm text-base-content/80">
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {entry.fixes.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-info">
                                            <Bug className="h-4 w-4" />
                                            Tuzatishlar
                                        </div>
                                        <ul className="space-y-1.5 ml-1 border-l-2 border-info/20 pl-4 py-1">
                                            {entry.fixes.map((fix, i) => (
                                                <li key={i} className="text-sm text-base-content/80">
                                                    {fix}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end border-t border-base-200 pt-4">
                <button onClick={onClose} className="btn btn-primary">
                    Tushunarli
                </button>
            </div>
        </Modal>
    );
}
