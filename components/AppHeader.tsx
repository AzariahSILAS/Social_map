// components/AppHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase, getCurrentUser, signOut } from "@/utils/supabase/client";
import Image from "next/image";

export function AppHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const pathname = usePathname();
  const router = useRouter();
  const isOnDashboard = pathname === "/dashboard";

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const current = await getCurrentUser();
        if (isMounted) setUser(current);
      } catch (err) {
        console.error("Failed to get current user:", err);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthClick = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    if (isOnDashboard) {
      await signOut();
      router.push("/");
      return;
    }

    router.push("/dashboard");
  };

  const buttonLabel = !user
    ? "Log in"
    : isOnDashboard
    ? "Log out"
    : "Profile";

  return (
    <header className="w-full border-b  border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md text-white">
      <div className="max-w-5xl mx-auto py-5 flex items-center justify-between px-4 py-1">
        {/* Logo text instead of image */}
        <button
          onClick={() => router.push("/")}
          
        >
          <div className=" flex text-lg font-semibold tracking-tight cursor-pointer">
            <Image
            src="/logo.png"
            alt="Social Map logo"
            width={32}
            height={32}
            className="rounded-full mx-5"
            />
            Social Map
          </div>
          
        </button>

        {/* Right button */}
        <button
          onClick={handleAuthClick}
          disabled={loadingUser}
          className="px-3 py-1 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm transition disabled:opacity-50 cursor-pointer"
        >
          {loadingUser ? "…" : buttonLabel}
        </button>
      </div>
    </header>
  );
}
