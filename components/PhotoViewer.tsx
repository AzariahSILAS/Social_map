import { X } from 'lucide-react';

interface PhotoViewerProps {
  photoUrl: string | null;
  onClose: () => void;
}

export function PhotoViewer({ photoUrl, onClose }: PhotoViewerProps) {
  if (!photoUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>
      
      <img 
        src={photoUrl} 
        alt="Photo"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}