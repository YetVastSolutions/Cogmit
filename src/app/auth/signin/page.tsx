import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-8 bg-background">
      <main className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Sign In
        </h1>
        <p className="text-lg text-muted-foreground">
          Log in to Cogmit to access your repositories.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <Button size="lg" type="submit">
            Log in with GitHub
          </Button>
        </form>
      </main>
    </div>
  );
}
