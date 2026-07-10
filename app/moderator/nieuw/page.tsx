import { Suspense } from "react";
import PresentationWizard from "./PresentationWizard";

export default function NewPresentationPage() {
  return (
    <Suspense fallback={null}>
      <PresentationWizard />
    </Suspense>
  );
}
