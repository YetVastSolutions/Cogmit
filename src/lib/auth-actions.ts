"use server";

import { auth } from "@/auth";

export async function checkSessionStatus() {
  try {
    const session = await auth();
    if (session?.user) {
      return {
        authenticated: true,
        user: {
          id: session.user.id || null,
          name: session.user.name || null,
          email: session.user.email || null,
          image: session.user.image || null,
        },
      } as const;
    }
  } catch (err: unknown) {
    const errorObj = err as { digest?: string; message?: string };
    if (errorObj?.digest === "DYNAMIC_SERVER_USAGE" || errorObj?.message?.includes("DYNAMIC_SERVER_USAGE")) {
      throw err;
    }
    // Avoid unhandled rejection on public routes or untrusted host edge contexts
  }
  return {
    authenticated: false,
    reason: "missing",
  } as const;
}
