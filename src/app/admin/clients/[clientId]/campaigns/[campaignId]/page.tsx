import { Suspense } from "react";
import CampaignPageContent from "./campaign-content";

export default function CampaignPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
      <CampaignPageContent />
    </Suspense>
  );
}
