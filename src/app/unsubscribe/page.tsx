import { Suspense } from "react";
import UnsubscribeClient from "./unsubscribe-client";

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-sm text-muted-foreground">Loading...</p>}>
      <UnsubscribeClient />
    </Suspense>
  );
}
