import { Camera, Map as MapIcon } from "lucide-react";

interface AppFooterProps {
  isLoggedIn: boolean;
  onClickFeed: () => void;
  onClickCamera: () => void;
}

export function AppFooter({
  isLoggedIn,
  onClickFeed,
  onClickCamera,
}: AppFooterProps) {
  return (
    <footer className="bg-slate-950/95 border-t border-slate-800 px-8 py-3 flex items-center justify-between">
      {/* Feed icon (always visible) */}
      <button
        type="button"
        onClick={onClickFeed}
        className="inline-flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-slate-100 transition"
      >
        <MapIcon className="w-5 h-5" />
        <span>Feed</span>
      </button>

      {/* Camera icon (only if logged in) */}
      {isLoggedIn && (
        <button
          type="button"
          onClick={onClickCamera}
          className="inline-flex flex-col items-center gap-1 text-xs text-slate-100"
        >
          <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition">
            <Camera className="w-5 h-5 text-slate-950" />
          </div>
          <span>Snap</span>
        </button>
      )}
    </footer>
  );
}
