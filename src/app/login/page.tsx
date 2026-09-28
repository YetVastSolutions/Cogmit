import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  // Await searchParams properly before accessing its properties in Next.js 15
  const params = await searchParams;
  const callbackUrl = (params.callbackUrl as string) || "/";

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Cogmit</h1>
          <p className="text-sm text-muted-foreground">Log in to access your repositories.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <Button size="lg" type="submit" className="w-full">
            Login with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}
