import { auth } from "@/auth";
import Link from "next/link";
import { HeaderControls } from "./HeaderControls";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export async function GlobalNav() {
  const session = await auth();

  const user = session?.user;
  const isAuthenticated = !!user;

  let displayName = user?.name || user?.email || "";
  if (displayName.length > 11) {
    displayName = displayName.substring(0, 10) + "…";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-[var(--header-content-max-width)] mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <Link 
          href="/" 
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-11 px-5 sm:px-6 font-bold text-[1.35rem]"
          )}
        >
          Cogmit
        </Link>

        <HeaderControls isAuthenticated={isAuthenticated} displayName={displayName} />
      </div>
    </header>
  );
}
