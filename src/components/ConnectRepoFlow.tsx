"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { InitCogmitResult } from "@/lib/github";
import type { RepoListItem, ConnectResult } from "@/lib/cogmit-actions";

/**
 * ConnectRepoFlow handles the "Connect to an existing cogmit repo" UI.
 *
 * It reuses the same repository-listing data that the Dashboard uses
 * (fetched via the shared fetchUserRepositories server action) and the
 * same validation logic (via handleConnectRepository).
 */
export function ConnectRepoFlow({
  initialRepos,
  connectAction,
  initiateCogmitDataAction,
}: {
  initialRepos: RepoListItem[];
  connectAction: (owner: string, repo: string) => Promise<ConnectResult>;
  initiateCogmitDataAction: () => Promise<InitCogmitResult>;
}) {
  const [repos] = useState(initialRepos);
  const [isPending, startTransition] = useTransition();
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);
  const [initResult, setInitResult] = useState<InitCogmitResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = (ownerLogin: string, repoName: string) => {
    setSelectedRepo({ owner: ownerLogin, name: repoName });
    setConnectResult(null);
    setInitResult(null);
    startTransition(async () => {
      const result = await connectAction(ownerLogin, repoName);
      setConnectResult(result);
    });
  };

  const handleInitiate = () => {
    setConnectResult(null);
    setInitResult(null);
    startTransition(async () => {
      const result = await initiateCogmitDataAction();
      setInitResult(result);
    });
  };

  // ── Connected successfully ───────────────────────────────────────────
  if (connectResult?.success) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full border border-green-600/30 rounded-lg p-6 bg-green-500/5">
          <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
            Repository connected
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {connectResult.owner}/{connectResult.repo}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            This repository contains a valid Cogmit structure.
          </p>
          <Link href={`/repo/${connectResult.owner}/${connectResult.repo}/explore`}>
            <Button>Explore Cogmit</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Init result (from the "Initiate Cogmit Data" fallback) ───────────
  if (initResult) {
    if (initResult.success) {
      return (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full border border-green-600/30 rounded-lg p-6 bg-green-500/5">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
              Cogmit data initialized
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your Cogmit data repository has been created and initialized.
            </p>
            <Link href={`/repo/${initResult.owner}/${initResult.repo}/explore`}>
              <Button>Explore Cogmit</Button>
            </Link>
          </div>
        </div>
      );
    }

// ── Removed org_creation_required state ──────────────────────────────

    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full border border-red-600/30 rounded-lg p-6 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Initialization failed
          </h2>
          <p className="text-sm text-muted-foreground">
            {initResult.reason === "error" ? initResult.message : initResult.reason}
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid repository selected ──────────────────────────────────────
  if (connectResult && !connectResult.success && connectResult.reason === "not_cogmit_repo") {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full border border-red-600/30 rounded-lg p-6 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            This is not a Cogmit repo
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {selectedRepo?.owner}/{selectedRepo?.name}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            This repository does not contain the expected Cogmit structure (
            <code className="text-xs">cogsIndex.json</code>,{" "}
            <code className="text-xs">projects/</code>,{" "}
            <code className="text-xs">NPPCogs/</code>).
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleInitiate} disabled={isPending}>
              {isPending ? "Initiating…" : "Initiate Cogmit Data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConnectResult(null);
                setSelectedRepo(null);
              }}
            >
              Choose a different repository
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Generic connect error ────────────────────────────────────────────
  if (connectResult && !connectResult.success) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full border border-red-600/30 rounded-lg p-6 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Connection failed
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {connectResult.reason}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setConnectResult(null);
              setSelectedRepo(null);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── Repository list ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search repositories…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 px-4 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {filteredRepos.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          {repos.length === 0
            ? "No repositories found or failed to load."
            : "No repositories match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="border border-border p-4 rounded-lg hover:border-primary transition-colors"
            >
              <h3 className="font-semibold text-base truncate">{repo.name}</h3>
              <p className="text-xs text-muted-foreground truncate mb-1">
                {repo.owner_login}/{repo.name}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {repo.description || "No description"}
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleConnect(repo.owner_login, repo.name)}
                  disabled={
                    isPending &&
                    selectedRepo?.owner === repo.owner_login &&
                    selectedRepo?.name === repo.name
                  }
                >
                  {isPending &&
                  selectedRepo?.owner === repo.owner_login &&
                  selectedRepo?.name === repo.name
                    ? "Connecting…"
                    : "Connect to Cogmit"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
