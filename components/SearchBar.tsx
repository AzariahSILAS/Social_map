"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  onLocationSelect: (lng: number, lat: number, placeName: string) => void;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const searchLocation = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    if (!MAPBOX_TOKEN) {
      console.warn("Missing NEXT_PUBLIC_MAPBOX_TOKEN – search disabled.");
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmed
      )}.json?access_token=${MAPBOX_TOKEN}&limit=5`;

      const response = await fetch(url);
      const data = await response.json();
      setResults((data?.features ?? []) as SearchResult[]);
    } catch (err) {
      console.error("Error searching location:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // simple debounce (300ms)
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void searchLocation(value);
    }, 300);
  };

  const handleSelectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    onLocationSelect(lng, lat, result.place_name);
    setQuery(result.place_name);
    setResults([]);
  };

  const showDropdown = results.length > 0 || isLoading;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={handleInputChange}
          className="pl-10 bg-card shadow-lg"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-20">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!isLoading &&
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelectLocation(result)}
                className="w-full border-b border-border px-4 py-3 text-left text-foreground hover:bg-muted transition-colors last:border-b-0"
              >
                <p className="text-sm">{result.place_name}</p>
              </button>
            ))}

          {!isLoading && results.length === 0 && query.trim() && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No locations found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
