"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice } from "@/lib/format";

export default function SearchOverlay() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  const fetchResults = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchResults]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateTo(sec) {
    const path =
      sec.type === "etf"
        ? `/etf/${sec.symbol.toLowerCase()}`
        : `/stock/${sec.symbol.toLowerCase()}`;
    setQuery("");
    setIsOpen(false);
    setResults([]);
    router.push(path);
  }

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          navigateTo(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search ticker or name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (query && results.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-56 lg:w-72 pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-silver/40 placeholder-silver focus:outline-none focus:border-sky focus:ring-1 focus:ring-sky/30 transition-colors"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-silver/20 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-sky border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && results.length === 0 && query.length >= 1 && (
            <div className="px-4 py-6 text-center text-silver text-sm">
              No results found
            </div>
          )}

          {!isLoading &&
            results.map((sec, i) => {
              const path =
                sec.type === "etf"
                  ? `/etf/${sec.symbol.toLowerCase()}`
                  : `/stock/${sec.symbol.toLowerCase()}`;

              return (
                <button
                  key={sec.symbol}
                  onClick={() => navigateTo(sec)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === activeIndex ? "bg-frost" : "hover:bg-mist"
                  }`}
                >
                  {sec.logo_url ? (
                    <Image
                      src={sec.logo_url}
                      alt={sec.symbol}
                      width={24}
                      height={24}
                      className="rounded-full shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-mist flex items-center justify-center text-xs font-bold text-slate shrink-0">
                      {sec.symbol.charAt(0)}
                    </div>
                  )}
                  <span className="font-semibold text-sm text-navy">
                    {sec.symbol}
                  </span>
                  <span className="text-sm text-slate truncate flex-1">
                    {sec.name}
                  </span>
                  <span className="font-price text-sm text-navy shrink-0">
                    {formatPrice(sec.price)}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
