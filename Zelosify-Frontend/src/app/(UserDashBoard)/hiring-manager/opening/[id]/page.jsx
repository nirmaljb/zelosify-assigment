import { redirect } from "next/navigation";

export default async function HiringManagerOpeningDetailAliasPage({ params }) {
  const { id } = await params;
  redirect(`/hiring-manager/openings/${id}`);
}
