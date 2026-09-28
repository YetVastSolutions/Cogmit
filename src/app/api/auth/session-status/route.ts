import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user) {
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id || null,
        name: session.user.name || null,
        email: session.user.email || null,
      },
    });
  }
  
  return NextResponse.json({
    authenticated: false,
    reason: "missing",
  });
}
