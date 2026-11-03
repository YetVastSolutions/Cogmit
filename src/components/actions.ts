"use server";

import { signIn, signOut } from "@/auth";
import { ROUTE_MY_COGS } from "@/constants";

export async function handleSignOut() {
  await signOut();
}

export async function handleSignIn() {
  await signIn("github", { redirectTo: ROUTE_MY_COGS });
}
