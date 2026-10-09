"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { CogmitDataStatus, InitCogmitResult } from "@/lib/github";

/**
 * CogmitDataProvisioning handles the home-page decision tree UI for
 * authenticated users.
 *
 * It presents two paths depending on the user's Cogmit data state:
 * - "Initiate Cogmit Data" (create org + repo)
 * - "Connect to an existing cogmit repo" (reuse existing repo)
 */
export function CogmitDataProvisioning({
  initialStatus,
  initiateCogmitDataAction,
}: {
  initialStatus: CogmitDataStatus | null;
  initiateCogmitDataAction: (isPrivate?: boolean) => Promise<InitCogmitResult>;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [creatingRepository, setCreatingRepository] = useState<"public" | "private" | null>(null);
  const [initResult, setInitResult] = useState<InitCogmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleInitiate = (isPrivate: boolean = true) => {
    setError(null);
    setInitResult(null);
    setCreatingRepository(isPrivate ? "private" : "public");
    startTransition(async () => {
      try {
        const result = await initiateCogmitDataAction(isPrivate);
        setInitResult(result);
        if (result.success) {
          setStatus({ state: "ready", owner: result.owner, repo: result.repo, isEmpty: true }); // Newly initialized repos are always empty initially
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setCreatingRepository(null);
      }
    });
  };

  // Loading / error fallback
  if (status === null) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
        <p className="text-muted-foreground text-center">
          Unable to determine Cogmit data status. Please try again later.
        </p>
      </div>
    );
  }

  // ── Ready state ──────────────────────────────────────────────────────
  if (status.state === "ready") {
    if (status.isEmpty) {
      return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
          <div className="w-full border border-green-600/30 rounded-lg p-6 bg-green-500/5">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
              Your Cogmit workspace is ready
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {status.owner}/{status.repo}
              </span>
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Your Cogmit data repository is connected and initialized.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              You haven&apos;t created a Cog yet.
            </p>
            <Link
              href="/myCogs/new/editCog"
              className="inline-flex w-full"
            >
              <Button className="w-full">Create your first Cog</Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        <div className="w-full border border-green-600/30 rounded-lg p-6 bg-green-500/5">
          <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
            Cogmit is ready
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {status.owner}/{status.repo}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Your Cogmit data repository is connected and valid.
          </p>
          <Link
            href="/myCogs"
            className="inline-flex"
          >
            <Button>Go to My Cogs</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Removed org_creation_required state ──────────────────────────────

  // ── Repo has unrelated files (from init result) ──────────────────────
  if (
    initResult &&
    !initResult.success &&
    initResult.reason === "repo_has_unrelated_files"
  ) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        <div className="w-full border border-red-600/30 rounded-lg p-6 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Cannot initialize
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            A repository named{" "}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              YVSApps_Cogmit_Data
            </span>{" "}
            already exists in your account but contains unrelated files.
            Cogmit will not overwrite existing data.
          </p>
          <p className="text-sm text-muted-foreground">
            Please remove the conflicting files or use a different repository,
            then try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Generic init error ───────────────────────────────────────────────
  if (
    initResult &&
    !initResult.success &&
    (initResult.reason === "error" || initResult.reason === "repo_already_exists_not_cogmit")
  ) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        <div className="w-full border border-red-600/30 rounded-lg p-6 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Initialization failed
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {initResult.reason === "error" ? initResult.message : "The repository already exists but is not a Cogmit repository."}
          </p>
          <Button onClick={() => handleInitiate(true)} disabled={isPending}>
            {isPending ? "Retrying…" : "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty state: repo missing or repo invalid ────────────────
  if (showOptions) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto">
        <div className="flex flex-col w-full text-left">
          <div className="text-center mb-8 border-b border-border pb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground mb-2">
              CREATE REPOSITORY
            </h2>
            <p className="text-muted-foreground">
              Choose how your Cogs and published Cogmits are stored.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Option 1 - Public Cogs */}
            <div className="border border-border rounded-xl p-6 flex flex-col bg-card shadow-sm hover:border-primary/50 transition-colors h-full">
              <div className="flex flex-col items-center text-center mb-6">
                <h3 className="text-xl font-bold mb-2 tracking-tight">PUBLIC COGS</h3>
                <p className="text-sm font-semibold text-foreground">
                  One public GitHub repository
                </p>
              </div>

              <div className="mb-6 flex flex-col gap-2 items-center">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit border border-border">
                  YVSApps_Data_Cogmit_Public
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Keep both your unpublished Cogs and published Cogmits in one public repository.
              </p>

              <ul className="text-sm space-y-3 mb-8 flex-1 text-muted-foreground list-disc list-inside">
                <li>Both your published Cogmits and unpublished Cogs are stored in this public repository.</li>
                <li>Your repository is publicly accessible — anyone can clone it or view your unpublished Cogs on GitHub.</li>
                <li>Unpublished Cogs remain unpublished within Cogmit and are not shown as public Cogmits.</li>
              </ul>

              <Button
                size="lg"
                onClick={() => handleInitiate(false)}
                disabled={isPending}
                className="w-full mt-auto"
              >
                {creatingRepository === "public" ? "Creating…" : "Create"}
              </Button>
            </div>

            {/* Option 2 - Private Cogs */}
            <div className="border border-border rounded-xl p-6 flex flex-col bg-card shadow-sm hover:border-primary/50 transition-colors h-full">
              <div className="flex flex-col items-center text-center mb-6">
                <h3 className="text-xl font-bold mb-2 tracking-tight">PRIVATE COGS</h3>
                <p className="text-sm font-semibold text-foreground">
                  Private Cogs + separate public Cogmits
                </p>
              </div>

              <div className="mb-6 flex flex-col gap-2 items-center">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit border border-border">
                  YVSApps_Data_Cogmit_Private
                </span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit border border-border">
                  YVSApps_Data_Cogmit_Public
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Keep your unpublished Cogs private while publishing selected Cogmits through a separate public repository.
              </p>

              <ul className="text-sm space-y-3 mb-8 flex-1 text-muted-foreground list-disc list-inside">
                <li>Your unpublished Cogs are stored in this private repository and cannot be seen by others.</li>
                <li>Your published Cogmits are stored in a separate public repository.</li>
                <li>Anyone can clone or view published Cogmits on GitHub and view them in Cogmit.</li>
              </ul>

              <Button
                size="lg"
                onClick={() => handleInitiate(true)}
                disabled={isPending}
                className="w-full mt-auto"
              >
                {creatingRepository === "private" ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center mt-6">
              {error}
            </p>
          )}

          <div className="mt-8 text-center">
            <Button variant="ghost" onClick={() => setShowOptions(false)} disabled={isPending}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
      <div className="flex flex-col w-full text-left">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-6">
          Connect Cogmit to GitHub
        </h2>

        <div className="flex flex-col items-center gap-3">
          <p className="text-foreground text-center text-sm mb-4">
            Cogmit stores your data in a GitHub repository that you control.
          </p>
          {status.state === "repo_invalid" ? (
            <p className="text-foreground text-center text-sm mb-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {status.owner}/{status.repo}
              </span>{" "}
              exists but does not contain a valid Cogmit structure.
            </p>
          ) : (
            <p className="text-foreground text-center text-sm mb-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                &lt;your-github-username&gt;/YVSApps_Cogmit_Data
              </span>
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}

          <Button
            size="lg"
            onClick={() => setShowOptions(true)}
            disabled={isPending}
            className="w-full"
          >
            Create Repository
          </Button>

          <Link href="/connect" className="w-full">
            <Button variant="outline" size="lg" className="w-full">
              Connect to an existing repository
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
