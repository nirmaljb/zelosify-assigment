import { redirect } from "next/navigation";

export default async function VendorOpeningDetailAliasPage({ params }) {
  const { id } = await params;
  redirect(`/vendor/openings/${id}`);
}
