"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { handleInitiateCogmitData } from "@/lib/cogmit-actions";
import type { InitCogmitResult } from "@/lib/github";

/**
 * Client component for the repo status page.
 * Shows "This is not a Cogmit repo" with "Initiate Cogmit Data" when invalid,
 * or the valid repo view when the structure is correct.
 */
export function RepoStatusView({
  owner,
  name,
  repoExists,
  isValid,
}: {
  owner: string;
  name: string;
  repoExists: boolean;
  isValid: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [initResult, setInitResult] = useState<InitCogmitResult | null>(null);

  const handleInitiate = () => {
    setInitResult(null);
    startTransition(async () => {
      const result = await handleInitiateCogmitData();
      setInitResult(result);
    });
  };

  // ── Valid Cogmit repository ──────────────────────────────────────────
  if (isValid) {
    return (
      <div className="border border-green-600/30 p-6 rounded-lg bg-green-500/5">
        <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">Repository is ready</h2>
        <p className="text-muted-foreground mb-4">
          This repository contains a valid Cogmit structure. You can now proceed to explore and edit your cognition tree.
        </p>
        <Link 
          href={`/repo/${owner}/${name}/explore`}
        >
          <Button>Explore Cogmit</Button>
        </Link>
      </div>
    );
  }

  // ── Init result: success ─────────────────────────────────────────────
  if (initResult?.success) {
    return (
      <div className="border border-green-600/30 p-6 rounded-lg bg-green-500/5">
        <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
          Cogmit data initialized
        </h2>
        <p className="text-muted-foreground mb-4">
          Your Cogmit data repository has been created and initialized.
        </p>
        <Link href={`/repo/${initResult.owner}/${initResult.repo}/explore`}>
          <Button>Explore Cogmit</Button>
        </Link>
      </div>
    );
  }

// ── Removed org_creation_required state ──────────────────────────────

  // ── Init result: error ───────────────────────────────────────────────
  if (initResult && !initResult.success) {
    return (
      <div className="border border-red-600/30 p-6 rounded-lg bg-red-500/5">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
          Initialization failed
        </h2>
        <p className="text-muted-foreground mb-4">
          {initResult.reason === "error" ? initResult.message : initResult.reason}
        </p>
        <Button onClick={handleInitiate} disabled={isPending}>
          {isPending ? "Retrying…" : "Try Again"}
        </Button>
      </div>
    );
  }

  // ── Repository not found ─────────────────────────────────────────────
  if (!repoExists) {
    return (
      <div className="border border-yellow-600/30 p-6 rounded-lg bg-yellow-500/5">
        <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
          Repository not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The GitHub repository <code className="text-xs bg-muted px-1 py-0.5 rounded">{owner}/{name}</code> could not be found.
        </p>
        <p className="text-muted-foreground mb-4">
          It may have been deleted, renamed, or is no longer accessible.
        </p>
        <div className="flex gap-4 mt-6">
          <Button onClick={handleInitiate} disabled={isPending}>
            {isPending ? "Creating…" : "Create my Cogmit repository"}
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Not a Cogmit repo ────────────────────────────────────────────────
  return (
    <div className="border border-red-600/30 p-6 rounded-lg bg-red-500/5">
      <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
        This is not a Cogmit repo
      </h2>
      <p className="text-muted-foreground mb-4">
        This repository does not contain the expected Cogmit structure (
        <code className="text-xs bg-muted px-1 py-0.5 rounded">cogsIndex.json</code>,{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">projects/</code>,{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">NPPCogs/</code>).
      </p>
      <p className="text-muted-foreground mb-4">
        You can initialize a new Cogmit data repository instead.
      </p>
      <Button onClick={handleInitiate} disabled={isPending}>
        {isPending ? "Initiating…" : "Initiate Cogmit Data"}
      </Button>
    </div>
  );
}
