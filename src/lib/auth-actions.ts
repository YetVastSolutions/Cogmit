"use server";

import { auth } from "@/auth";

export async function checkSessionStatus() {
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
  return {
    authenticated: false,
    reason: "missing",
  } as const;
}
