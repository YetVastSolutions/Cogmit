"use server";

import { auth } from "@/auth";
import {
  getCogmitDataStatus,
  initiateCogmitData,
  validateCogmitRepository,
  listUserRepositories,
  type CogmitDataStatus,
  type InitCogmitResult,
} from "@/lib/github";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Check Cogmit data status (used by home page)
// ---------------------------------------------------------------------------

/**
 * Server action to determine the current Cogmit data state for the
 * authenticated user. Implements the first-login decision tree.
 */
export async function checkCogmitDataStatus(): Promise<CogmitDataStatus | null> {
  const session = await auth();
  if (!session) return null;

  try {
    return await getCogmitDataStatus();
  } catch (error) {
    console.error("Failed to check Cogmit data status:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Initiate Cogmit Data (shared action used from Home + invalid repo state)
// ---------------------------------------------------------------------------

/**
 * Server action implementing "Initiate Cogmit Data".
 *
 * This is the **single** shared implementation used by:
 * - Home page empty state ("Initiate Cogmit Data" button)
 * - Invalid repository state ("Initiate Cogmit Data" button)
 */
export async function handleInitiateCogmitData(): Promise<InitCogmitResult> {
  const session = await auth();
  if (!session) {
    return { success: false, reason: "error", message: "Not authenticated" };
  }

  try {
    return await initiateCogmitData();
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to initiate Cogmit data:", error);
    return { success: false, reason: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Connect to an existing Cogmit repository
// ---------------------------------------------------------------------------

export type ConnectResult =
  | { success: true; owner: string; repo: string }
  | { success: false; reason: "not_cogmit_repo" }
  | { success: false; reason: string };

/**
 * Server action to validate and connect to an existing repository as
 * the user's Cogmit data source.
 */
export async function handleConnectRepository(
  owner: string,
  repo: string
): Promise<ConnectResult> {
  const session = await auth();
  if (!session) {
    return { success: false, reason: "Not authenticated" };
  }

  try {
    const isValid = await validateCogmitRepository(owner, repo);
    if (!isValid) {
      return { success: false, reason: "not_cogmit_repo" };
    }
    return { success: true, owner, repo };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to connect repository:", error);
    return { success: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// List repositories (shared by Dashboard + Connect flow)
// ---------------------------------------------------------------------------

export type RepoListItem = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner_login: string;
  private: boolean;
  updated_at: string | null;
};

/**
 * Server action that returns a simplified list of user-accessible repositories.
 */
export async function fetchUserRepositories(): Promise<RepoListItem[]> {
  const session = await auth();
  if (!session) return [];

  try {
    const repos = await listUserRepositories();
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      owner_login: r.owner.login,
      private: r.private,
      updated_at: r.updated_at,
    }));
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to fetch repositories:", error);
    return [];
  }
}
