import { redirect } from "next/navigation";

export default async function SlugRedirect({ params }: { params: Promise<{ authorId: string; cogmitId: string; slug: string }> }) {
  const { authorId, cogmitId } = await params;
  redirect(`/cogmits/${authorId}/${cogmitId}`);
}
