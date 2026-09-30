"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import { handleSignOut } from "@/components/actions";

export type SessionStatus =
  | {
      authenticated: true;
      user: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
    }
  | {
      authenticated: false;
      reason?: "missing" | "expired" | "invalid" | "revoked";
    };

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: NonNullable<SessionStatus & { authenticated: true }>["user"] }
  | { status: "unauthenticated" };

export type AuthContextType = AuthState & {
  isAuthenticated: boolean;
  handleAuthFailure: () => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let authFailureHandled = false;

export function clearAuthenticatedUserData() {
  try {
    const theme = localStorage.getItem("theme");
    localStorage.clear();
    sessionStorage.clear();
    if (theme) {
      localStorage.setItem("theme", theme);
    }
  } catch {
    // Ignore errors in restricted environments
  }
}

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: SessionStatus | null;
}) {

  
  const getInitialState = (): AuthState => {
    if (!initialSession) return { status: "loading" };
    if (initialSession.authenticated) {
      return { status: "authenticated", user: initialSession.user };
    }
    return { status: "unauthenticated" };
  };

  const [authState, setAuthState] = useState<AuthState>(getInitialState());

  const handleAuthFailure = useCallback(async () => {
    if (authFailureHandled) return;
    authFailureHandled = true;

    clearAuthenticatedUserData();
    setAuthState({ status: "unauthenticated" });
    
    try {
      await handleSignOut(); // server-side signOut clears cookies
    } catch {
      // It might throw a NEXT_REDIRECT error which is expected
    }
    
    // Reset guard after short delay
    setTimeout(() => {
      authFailureHandled = false;
    }, 2000);
  }, []);

  const logout = useCallback(async () => {
    clearAuthenticatedUserData();
    setAuthState({ status: "unauthenticated" });
    try {
      await handleSignOut();
    } catch {
      // It might throw a NEXT_REDIRECT error which is expected
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session-status");
      const data = await res.json() as SessionStatus;
      if (data.authenticated) {
        setAuthState({ status: "authenticated", user: data.user });
      } else {
        setAuthState({ status: "unauthenticated" });
      }
    } catch {
      setAuthState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    // We can dispatch 'github-auth-error' on the window from client-side api calls
    const handleGlobalAuthError = (e: Event) => {
      if (e instanceof CustomEvent && e.detail === "AUTH_FAILURE") {
        handleAuthFailure();
      }
    };
    window.addEventListener("github-auth-error", handleGlobalAuthError);
    return () => window.removeEventListener("github-auth-error", handleGlobalAuthError);
  }, [handleAuthFailure]);

  const value = {
    ...authState,
    isAuthenticated: authState.status === "authenticated",
    handleAuthFailure,
    refreshSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
