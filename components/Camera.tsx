import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface CameraProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Camera({ isOpen, onClose }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragDistance, setDragDistance] = useState(0);
  const [isCaptured, setIsCaptured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCaptured(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setIsCaptured(true);
      }
    }
  };

  const handleRetake = () => {
    setIsCaptured(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart !== null) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - dragStart;
      if (distance > 0) {
        setDragDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragDistance > 100) {
      onClose();
    }
    setDragStart(null);
    setDragDistance(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart !== null) {
      const distance = e.clientY - dragStart;
      if (distance > 0) {
        setDragDistance(distance);
      }
    }
  };

  const handleMouseUp = () => {
    if (dragDistance > 100) {
      onClose();
    }
    setDragStart(null);
    setDragDistance(0);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      style={{
        transform: `translateY(${dragDistance}px)`,
        transition: dragStart === null ? 'transform 0.3s ease-out' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header with close button */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="w-10 h-1 bg-white/50 rounded-full mx-auto" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${isCaptured ? 'hidden' : ''}`}
        />
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover ${isCaptured ? '' : 'hidden'}`}
        />
      </div>

      {/* Controls */}
      <div className="bg-black/50 p-6 flex justify-center items-center gap-4">
        {!isCaptured ? (
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-colors"
          />
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={() => {
                // TODO: Handle save/upload photo
                console.log('Photo captured!');
                onClose();
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Use Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}