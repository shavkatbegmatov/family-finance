import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import {
    Upload,
    ZoomIn,
    ZoomOut,
    RotateCw,
    RotateCcw,
    Image,
    X,
    CheckCircle,
    Loader,
    Link,
} from 'lucide-react';

interface AvatarUploaderProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

// Canvas orqali kesilgan rasmni blob'ga aylantirish
async function getCroppedImage(
    imageSrc: string,
    pixelCrop: Area,
    rotation: number = 0,
    outputSize: number = 512
): Promise<Blob> {
    const image = await createImageBitmap(
        await (await fetch(imageSrc)).blob()
    );

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d')!;

    // Background for transparent images
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outputSize / 2, -outputSize / 2);

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize,
        outputSize
    );

    ctx.restore();
    image.close();

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas bo'sh blob qaytardi"));
        }, 'image/jpeg', 0.90);
    });
}

async function uploadToImgBB(blob: Blob): Promise<string> {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey || apiKey === 'your_imgbb_api_key_here') {
        throw new Error('ImgBB API kaliti sozlanmagan (.env.local faylida VITE_IMGBB_API_KEY o\'rnating)');
    }

    const formData = new FormData();
    formData.append('image', blob, 'avatar.jpg');

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error(`ImgBB yuklashda xatolik: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
        throw new Error(data?.error?.message || 'ImgBB xatolik qaytardi');
    }

    // Use the display_url which is direct
    return data.data.display_url || data.data.url;
}

type UploadStep = 'idle' | 'crop' | 'uploading' | 'done' | 'error';

export function AvatarUploader({ value, onChange, label = 'Rasm' }: AvatarUploaderProps) {
    const [step, setStep] = useState<UploadStep>('idle');
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 16 * 1024 * 1024) {
            setError("Rasm hajmi 16MB dan oshmasligi kerak");
            setStep('error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setRawImage(reader.result as string);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setStep('crop');
            setError(null);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    }, []);

    const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedArea(croppedPixels);
    }, []);

    const handleUpload = useCallback(async () => {
        if (!rawImage || !croppedArea) return;
        setStep('uploading');
        setError(null);
        try {
            const blob = await getCroppedImage(rawImage, croppedArea, rotation);
            const url = await uploadToImgBB(blob);
            onChange(url);
            setStep('done');
            setRawImage(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Noma\'lum xatolik');
            setStep('error');
        }
    }, [rawImage, croppedArea, rotation, onChange]);

    const handleCancel = () => {
        setRawImage(null);
        setStep('idle');
        setError(null);
    };

    const handleUrlSubmit = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        onChange(trimmed);
        setUrlInput('');
        setShowUrlInput(false);
    };

    const handleRemove = () => {
        onChange('');
        setStep('idle');
        setError(null);
    };

    return (
        <div className="space-y-2">
            <label className="label pb-0">
                <span className="label-text text-sm font-medium">{label}</span>
            </label>

            {/* CROP UI */}
            {step === 'crop' && rawImage && (
                <div className="rounded-2xl border border-base-300 overflow-hidden bg-base-200 shadow-lg">
                    {/* Crop area */}
                    <div className="relative" style={{ height: 280 }}>
                        <Cropper
                            image={rawImage}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={handleCropComplete}
                        />
                    </div>

                    {/* Controls */}
                    <div className="p-4 space-y-3 bg-base-100">
                        {/* Zoom */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                            >
                                <ZoomOut className="h-3.5 w-3.5" />
                            </button>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="range range-xs range-primary flex-1"
                            />
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                            >
                                <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs text-base-content/40 w-10 text-right">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>

                        {/* Rotation */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={() => setRotation((r) => r - 90)}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <input
                                type="range"
                                min={-180}
                                max={180}
                                step={1}
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="range range-xs range-secondary flex-1"
                            />
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={() => setRotation((r) => r + 90)}
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs text-base-content/40 w-10 text-right">
                                {rotation}°
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                className="btn btn-outline btn-sm flex-1"
                                onClick={handleCancel}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm flex-1"
                                onClick={handleUpload}
                            >
                                <Upload className="h-4 w-4" />
                                Yuklash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOADING */}
            {step === 'uploading' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-base-200 border border-base-300">
                    <Loader className="h-5 w-5 animate-spin text-primary shrink-0" />
                    <span className="text-sm text-base-content/70">Rasm yuklanmoqda...</span>
                </div>
            )}

            {/* IDLE / DONE - Preview + Upload Button */}
            {(step === 'idle' || step === 'done' || step === 'error') && (
                <div className="space-y-2">
                    <div className="flex items-start gap-3">
                        {/* Preview */}
                        <div className="h-16 w-16 rounded-full bg-base-200 border-2 border-base-300 overflow-hidden flex items-center justify-center shrink-0">
                            {value ? (
                                <img src={value} alt="Avatar" className="h-16 w-16 object-cover" />
                            ) : (
                                <Image className="h-7 w-7 text-base-content/20" />
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary btn-outline"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4" />
                                    Rasm tanlash
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setShowUrlInput((v) => !v)}
                                >
                                    <Link className="h-4 w-4" />
                                    URL
                                </button>
                                {value && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost text-error"
                                        onClick={handleRemove}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {step === 'done' && (
                                <div className="flex items-center gap-1.5 text-xs text-success">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Muvaffaqiyatli yuklandi!</span>
                                </div>
                            )}
                            {step === 'error' && error && (
                                <p className="text-xs text-error">{error}</p>
                            )}
                        </div>
                    </div>

                    {/* URL Input (optional fallback) */}
                    {showUrlInput && (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                className="input input-sm input-bordered flex-1 text-[13px]"
                                placeholder="https://i.ibb.co/..."
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={handleUrlSubmit}
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>
            )}

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
}
