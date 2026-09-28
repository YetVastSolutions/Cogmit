import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { CogmitDataProvisioning } from "@/components/CogmitDataProvisioning";
import { getCogmitDataStatus, isAuthenticationRequiredError } from "@/lib/github";
import { handleInitiateCogmitData } from "@/lib/cogmit-actions";
import { checkSessionStatus } from "@/lib/auth-actions";

export default async function Home() {
  const sessionStatus = await checkSessionStatus();

  let cogmitStatus = null;
  let authFailed = false;

  if (sessionStatus.authenticated) {
    try {
      cogmitStatus = await getCogmitDataStatus();
    } catch (error) {
      if (isAuthenticationRequiredError(error)) {
        authFailed = true;
      } else {
        console.error("Failed to check Cogmit data status:", error);
      }
    }
  }

  return (
    <div className="flex flex-col items-center pt-16 px-4 pb-8 sm:px-8 bg-background flex-1 w-full max-w-[var(--page-content-max-width)] mx-auto">
      <main className="flex flex-col items-center gap-12 max-w-2xl text-center w-full">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Cogmit
          </h1>
          <p className="text-lg text-muted-foreground">
            Your GitHub-native cognition and content repository.
          </p>
        </div>

        {(sessionStatus.authenticated && !authFailed) ? (
          <CogmitDataProvisioning
            initialStatus={cogmitStatus}
            initiateCogmitDataAction={handleInitiateCogmitData}
          />
        ) : (
          <div className="mt-4">
            {authFailed && (
              <p className="text-destructive mb-4">
                Your session has expired. Please log in again.
              </p>
            )}
            <form
              action={async () => {
                "use server";
                await signIn("github");
              }}
            >
              <Button size="lg" type="submit">
                Log in with GitHub
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
