"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCogHistory } from "./actions";
import { History, X } from "lucide-react";
import Link from "next/link";

export type CogHistoryEntry = {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  authorName?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
  htmlUrl?: string;
};

interface HistoryModalProps {
  cogId: string;
  className?: string;
  children?: React.ReactNode;
}

export function HistoryModal({ cogId, className, children }: HistoryModalProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<CogHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCogHistory(cogId);
      if (res.success && res.history) {
        setHistory(res.history);
      } else {
        setError(res.error || "Failed to load history.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else {
      setHistory([]);
      setError(null);
    }
  }, [open, cogId]);

  return (
    <>
      <Button variant="outline" className={className || "w-full h-10 flex items-center justify-center gap-2"} onClick={() => setOpen(true)}>
        {children || (
          <>
            <History className="h-4 w-4" />
            History
          </>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div 
            className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] p-6 relative flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing it
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6">History</h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {loading && (
                <div className="flex justify-center p-8 text-muted-foreground">
                  Loading history…
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                  <p className="text-destructive text-center">Unable to load history.</p>
                  <Button onClick={fetchHistory} variant="outline">Try again</Button>
                </div>
              )}

              {!loading && !error && history.length === 0 && (
                <div className="flex justify-center p-8 text-muted-foreground text-center">
                  No history found for this Cog.
                </div>
              )}

              {!loading && !error && history.length > 0 && (
                <div className="flex flex-col">
                  {history.map((entry, index) => (
                    <div key={entry.sha}>
                      {index > 0 && <hr className="my-4 border-border" />}
                      <div className="flex flex-col space-y-2">
                        <p className="font-semibold text-sm">
                          {entry.htmlUrl ? (
                            <Link href={entry.htmlUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {entry.message}
                            </Link>
                          ) : (
                            entry.message
                          )}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          {entry.authorAvatarUrl && (
                            <img src={entry.authorAvatarUrl} alt={entry.authorName || "Author"} className="h-6 w-6 rounded-full" />
                          )}
                          <div className="flex items-center space-x-1">
                            <span>{entry.authorName}</span>
                            {entry.authorLogin && (
                              <span>&middot; @{entry.authorLogin}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{entry.date ? new Date(entry.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown date'}</span>
                          <span>&middot;</span>
                          <span className="font-mono">{entry.shortSha}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
