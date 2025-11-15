"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upsertProfile = async (userId: string, username: string) => {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          username,
          full_name: "",
          avatar_url: null,
          bio: "",
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Error upserting profile:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        const user = data.user;
        const session = data.session;

        if (!user) {
          throw new Error("No user returned from sign up.");
        }

        if (session) {
          await upsertProfile(user.id, username);
          router.push("/");
        } else {
          setMessage(
            "Account created! Check your email for a confirmation link before logging in."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user) {
          // later you can ensure profile exists here if you want
        }

        router.push("/");
      }
    } catch (err: any) {
      console.error("Auth error raw:", err);
      const msg =
        err?.message ||
        err?.error_description ||
        err?.error ||
        "Something went wrong during authentication.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signup" ? "login" : "signup"));
    setError(null);
    setMessage(null);
  };

  const isSignup = mode === "signup";

  return (
    <div className="h-full flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Optional: simple header to match the app */}
     

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl p-6">
          <h2 className="text-2xl font-semibold mb-2 text-center">
            {isSignup ? "Create an account" : "Log in"}
          </h2>
          <p className="text-sm text-slate-400 mb-6 text-center">
            {isSignup
              ? "Sign up to start posting to the map."
              : "Welcome back. Log in to continue."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label
                  className="block text-sm font-medium mb-1 text-slate-200"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                  placeholder="azariah_explore"
                />
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-1 text-slate-200"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1 text-slate-200"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-700/50 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            {message && (
              <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-700/50 rounded-md px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center rounded-md bg-sky-500 text-slate-950 py-2.5 text-sm font-medium hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading
                ? isSignup
                  ? "Creating account..."
                  : "Logging in..."
                : isSignup
                ? "Create account"
                : "Log in"}
            </button>
          </form>

          <button
            type="button"
            onClick={toggleMode}
            className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-100 transition"
          >
            {isSignup
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
