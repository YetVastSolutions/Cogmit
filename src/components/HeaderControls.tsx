"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { handleSignIn } from "./actions";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function HeaderControls({
  isAuthenticated,
  displayName
}: {
  isAuthenticated: boolean;
  displayName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  // Toggle dropdown
  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme toggle handler
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    const newTheme = isDark ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  // Restore theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const onSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="h-10 w-10 shrink-0 rounded-md shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </Button>

      {isAuthenticated ? (
        <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
          <Button
            onClick={toggleDropdown}
            aria-expanded={isOpen}
            aria-haspopup="true"
            className="h-10 font-semibold px-4 sm:px-5 shrink-0"
          >
            {displayName}
          </Button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-border bg-popover shadow-md ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <Link
                  href="/myCogs"
                  className="block w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-muted hover:text-foreground transition-colors"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  My Cogs
                </Link>
                <form onSubmit={onSignOut} className="w-full">
                  <button
                    type="submit"
                    className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                    role="menuitem"
                  >
                    Log off
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form action={handleSignIn} className="shrink-0">
          <Button type="submit" className="h-10 font-semibold px-4 sm:px-5 shrink-0">
            Log in with GitHub
          </Button>
        </form>
      )}
    </div>
  );
}
