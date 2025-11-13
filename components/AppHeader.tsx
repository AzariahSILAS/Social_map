import type { User } from "@supabase/supabase-js";
import { User as UserIcon, LogIn } from "lucide-react";

interface AppHeaderProps {
  user: User | null;
  isLoading: boolean;
  onClickLogin: () => void;
  onClickProfile: () => void;
}

export function AppHeader({
  user,
  isLoading,
  onClickLogin,
  onClickProfile,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/95">
      <div className="flex items-center gap-2">
        {/* Tiny logo circle */}
        <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-xs font-semibold text-sky-300">
          SM
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-[0.16em] uppercase text-slate-300">
            Social Map
          </span>
          <span className="text-[11px] text-slate-500">
            See what’s happening around you
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLoading ? null : user ? (
          <button
            type="button"
            onClick={onClickProfile}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 transition"
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClickLogin}
            className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Log in</span>
          </button>
        )}
      </div>
    </header>
  );
}
