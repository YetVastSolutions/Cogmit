import { auth } from "@/auth";
import { getCogmitDataStatus, getProjects } from "@/lib/github";
import { redirect } from "next/navigation";
import { EditCogClient } from "@/app/myCogs/[cogId]/editCog/EditCogClient";

export default async function NewEditCogPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    redirect("/myCogs");
  }

  const projects = await getProjects();

  return (
    <EditCogClient 
      mode="new"
      initialTitle=""
      initialProject="No Parent Project"
      initialContent=""
      projects={projects}
    />
  );
}
