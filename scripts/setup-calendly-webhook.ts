/**
 * One-time Calendly webhook registration.
 *
 * Usage:
 *   npm run calendly:webhook
 *
 * Reads CALENDLY_ACCESS_TOKEN from `.env`.
 * Token needs scopes: users:read, webhooks:write, scheduled_events:read
 * Requires NEXT_PUBLIC_APP_URL (or pass WEBHOOK_URL).
 *
 * You supply signing_key yourself (Calendly does not generate one).
 * We generate one, pass it on create, and print CALENDLY_WEBHOOK_SECRET.
 */

import { randomBytes } from "crypto";
import { loadEnv } from "./load-env";

loadEnv();

const API = "https://api.calendly.com";

async function calendlyFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as {
        message?: string;
        required_scopes?: string[];
      };
      if (parsed.required_scopes?.length) {
        detail = `${parsed.message ?? "Insufficient scope"}\nRequired scopes: ${parsed.required_scopes.join(", ")}`;
      }
    } catch {
      // keep raw text
    }
    throw new Error(`Calendly API ${path} failed (${res.status}): ${detail}`);
  }
  return text ? JSON.parse(text) : {};
}

async function deleteExistingSubscriptions(
  token: string,
  organization: string,
  user: string,
  webhookUrl: string,
) {
  const query = new URLSearchParams({
    organization,
    user,
    scope: "user",
  });
  const listed = (await calendlyFetch(`/webhook_subscriptions?${query}`, token)) as {
    collection?: Array<{ uri: string; callback_url: string }>;
  };

  for (const sub of listed.collection ?? []) {
    if (sub.callback_url !== webhookUrl) continue;
    const uuid = sub.uri.split("/").pop();
    if (!uuid) continue;
    console.log("Removing existing subscription:", uuid);
    await calendlyFetch(`/webhook_subscriptions/${uuid}`, token, { method: "DELETE" });
  }
}

async function main() {
  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();
  if (!token) {
    console.error("Missing CALENDLY_ACCESS_TOKEN in environment.");
    process.exit(1);
  }

  const webhookUrl =
    process.env.WEBHOOK_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/api/calendly/webhook`;

  if (!webhookUrl.startsWith("https://")) {
    console.error("Webhook URL must be HTTPS. Set NEXT_PUBLIC_APP_URL or WEBHOOK_URL.");
    process.exit(1);
  }

  // Calendly expects YOU to provide signing_key — it is not returned by the API.
  const signingKey =
    process.env.CALENDLY_WEBHOOK_SECRET?.trim() &&
    process.env.CALENDLY_WEBHOOK_SECRET.trim() !== "signing_key_from_webhook_subscription"
      ? process.env.CALENDLY_WEBHOOK_SECRET.trim()
      : randomBytes(32).toString("base64url");

  console.log("Fetching Calendly user / organization...");
  const me = (await calendlyFetch("/users/me", token)) as {
    resource: {
      uri: string;
      current_organization: string;
    };
  };

  const organization = me.resource.current_organization;
  const user = me.resource.uri;

  console.log("Organization:", organization);
  console.log("User:", user);
  console.log("Registering webhook:", webhookUrl);

  await deleteExistingSubscriptions(token, organization, user, webhookUrl);

  const body = {
    url: webhookUrl,
    events: ["invitee.created"],
    organization,
    user,
    scope: "user",
    signing_key: signingKey,
  };

  const created = (await calendlyFetch("/webhook_subscriptions", token, {
    method: "POST",
    body: JSON.stringify(body),
  })) as {
    resource: {
      uri: string;
      callback_url: string;
      state: string;
    };
  };

  console.log("\nWebhook created successfully.");
  console.log("Subscription URI:", created.resource.uri);
  console.log("Callback URL:", created.resource.callback_url);
  console.log("State:", created.resource.state);
  console.log("\nAdd this to your .env (store it safely):");
  console.log(`CALENDLY_WEBHOOK_SECRET=${signingKey}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
