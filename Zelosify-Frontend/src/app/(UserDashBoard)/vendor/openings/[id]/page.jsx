"use client";

import { useParams } from "next/navigation";
import OpeningDetailLayout from "@/components/UserDashboardPage/IT_VENDOR/ContractHiring/OpeningDetailLayout";

export default function VendorOpeningDetailPage() {
  const params = useParams();
  const openingId = params?.id;

  return (
    <div className="w-full">
      <OpeningDetailLayout openingId={openingId} />
    </div>
  );
}
