// components/AppFooter.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Home, Map } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AppFooter() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && isMounted) {
          setUser(data.user ?? null);
        }
      } catch (err) {
        console.error("Footer auth error:", err);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isCameraPage = pathname === "/camera";
  const isFeedPage = pathname === "/feed";
  const isHomePage = pathname === "/";

  const isLoggedIn = !!user;

  return (
    <footer className="block border-t border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md text-white">
      <div className="max-w-5xl mx-auto flex items-center justify-around px-4 py-2">
        {/* Home */}
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center text-xs hover:text-white/80 transition"
        >
          <Home
            className={`w-6 h-6 ${
              isHomePage ? "text-white" : "text-white/60"
            }`}
          />
          <span>Home</span>
        </button>

        {/* Camera – only if logged in & not already on /camera */}
        {isLoggedIn && !isCameraPage && (
          <button
            onClick={() => router.push("/camera")}
            disabled={loadingUser}
            className="flex flex-col items-center text-xs hover:text-white/80 transition disabled:opacity-50"
          >
            <Camera
              className={`w-6 h-6 ${
                isCameraPage ? "text-white" : "text-white/60"
              }`}
            />
            <span>Camera</span>
          </button>
        )}

        {/* Feed (you can decide if guests see it or not; here: always visible) */}
        <button
          onClick={() => router.push("/feed")}
          className="flex flex-col items-center text-xs hover:text-white/80 transition"
        >
          <Map
            className={`w-6 h-6 ${
              isFeedPage ? "text-white" : "text-white/60"
            }`}
          />
          <span>Feed</span>
        </button>
      </div>
    </footer>
  );
}
