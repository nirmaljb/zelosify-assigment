"use client";

import { useParams } from "next/navigation";
import HMOpeningDetailLayout from "@/components/UserDashboardPage/HIRING_MANAGER/ContractHiring/HMOpeningDetailLayout";

export default function HiringManagerOpeningDetailPage() {
  const params = useParams();
  const openingId = params?.id;

  return (
    <div className="w-full">
      <HMOpeningDetailLayout openingId={openingId} />
    </div>
  );
}
