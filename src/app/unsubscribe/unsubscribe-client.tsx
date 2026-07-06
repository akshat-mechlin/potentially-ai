"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const loading = Boolean(contactId) && !done && !failed;

  useEffect(() => {
    if (!contactId) return;

    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        setDone(true);
      })
      .catch(() => {
        setFailed(true);
        toast.error("Could not process unsubscribe");
      });
  }, [contactId]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe</CardTitle>
          <CardDescription>
            {loading
              ? "Processing your request..."
              : done
                ? "You have been unsubscribed from Potentially outreach emails."
                : contactId
                  ? "Something went wrong. Please contact support."
                  : "Missing contact reference."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/">Return to Potentially</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
