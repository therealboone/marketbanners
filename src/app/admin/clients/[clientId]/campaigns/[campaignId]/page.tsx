import { Suspense } from "react";
import CampaignPageContent from "./campaign-content";

export default function CampaignPage() {
  return (
    <Suspense fallback={<p className="type-caption">Loading...</p>}>
      <CampaignPageContent />
    </Suspense>
  );
}
