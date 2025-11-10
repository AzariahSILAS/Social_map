"use client";

import { useState } from "react";
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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchLocation = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
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
    void searchLocation(value);
  };

  const handleSelectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    onLocationSelect(lng, lat, result.place_name);
    setQuery(result.place_name);
    setResults([]);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={handleInputChange}
          className="pl-10 bg-white shadow-lg"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 max-h-64 overflow-y-auto z-10">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectLocation(result)}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <p className="text-slate-900">{result.place_name}</p>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 px-4 py-3">
          <p className="text-slate-500">Searching...</p>
        </div>
      )}
    </div>
  );
}
