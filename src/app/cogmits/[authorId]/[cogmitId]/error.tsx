"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CogmitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public Cogmit route encountered an error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-bold text-destructive">Unable to Load Cogmit</h1>
        <p className="text-sm text-muted-foreground">
          An error occurred while loading this public Cogmit. This could be due to a temporary network issue.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="default" onClick={() => reset()}>
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

