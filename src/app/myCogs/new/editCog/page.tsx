import { auth } from "@/auth";
import { getCogmitDataStatus, getProjects } from "@/lib/github";
import { redirect } from "next/navigation";
import { ROUTE_LOGIN, ROUTE_MY_COGS, NO_PARENT_PROJECT } from "@/constants";
import { EditCogClient } from "@/app/myCogs/[cogId]/editCog/EditCogClient";

export default async function NewEditCogPage() {
  const session = await auth();
  if (!session) {
    redirect(ROUTE_LOGIN);
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    redirect(ROUTE_MY_COGS);
  }

  const projects = await getProjects();

  return (
    <EditCogClient 
      mode="new"
      initialTitle=""
      initialProject={NO_PARENT_PROJECT}
      initialContent=""
      projects={projects}
    />
  );
}
