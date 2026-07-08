"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useUIStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import type { Profile } from "@/types";
import { DesktopOnly, MobileSegmented } from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EmailSenderSettings } from "@/components/settings/email-sender-settings";

const SETTINGS_KEY = "potentially-notification-prefs";

type NotificationPrefs = {
  email: boolean;
  intros: boolean;
  sync: boolean;
};

type SettingsTab = "profile" | "email" | "playbooks" | "notifications" | "appearance";

const defaultNotifications: NotificationPrefs = {
  email: true,
  intros: true,
  sync: false,
};

function readNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return defaultNotifications;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultNotifications;
  try {
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return defaultNotifications;
  }
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { compactMode, setCompactMode } = useUIStore();
  const { isMobileApp } = useMobileApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [notifications, setNotifications] = useState(readNotificationPrefs);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (res.ok) return res.json() as Promise<Profile>;

      if (!isDemoMode()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata ?? {};
          return {
            id: user.id,
            email: user.email ?? "",
            name:
              (typeof meta.full_name === "string" && meta.full_name) ||
              (typeof meta.name === "string" && meta.name) ||
              user.email?.split("@")[0] ||
              null,
            avatar_url: null,
            bio: null,
            title: null,
            linkedin_url: null,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies Profile;
        }
      }

      if (res.status === 401) return null;
      throw new Error("Failed to load profile");
    },
  });

  useEffect(() => {
    if (!profile) return;
    // Sync editable fields when profile loads from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form draft mirrors fetched profile
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
    setTitle(profile.title ?? "");
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, title }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      const updated = (await res.json()) as Profile;
      queryClient.setQueryData(["profile"], updated);
      setName(updated.name ?? "");
      setEmail(updated.email ?? "");
      setTitle(updated.title ?? "");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(notifications));
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = (key: keyof NotificationPrefs, checked: boolean) => {
    const next = { ...notifications, [key]: checked };
    setNotifications(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const profilePanel = (
    <div className={isMobileApp ? "mobile-card-flat space-y-4 p-4" : "space-y-4"}>
      {!isMobileApp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled type="email" />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. CEO at Acme Ventures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      )}
      {isMobileApp && (
        <>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled type="email" />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. CEO at Acme Ventures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </>
      )}
    </div>
  );

  const emailPanel = <EmailSenderSettings compact={isMobileApp} />;

  const playbooksPanel = (
    <div className={isMobileApp ? "mobile-card-flat space-y-4 p-4 text-sm text-muted-foreground" : "space-y-4"}>
      {!isMobileApp ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Playbook defaults</CardTitle>
            <CardDescription>
              Default outreach behavior for new Playbooks in this group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Automation:</span> Assist mode — drafts
              require your approval before sending.
            </p>
            <p>
              <span className="font-medium text-foreground">Outreach:</span> Warm path preferred —
              contacts with intro routes are prioritized.
            </p>
            <p>
              <span className="font-medium text-foreground">Dedupe & cooldown:</span> Configure per
              playbook under ICP & settings. Cooldown uses last contacted date from send history.
            </p>
            <p>
              <span className="font-medium text-foreground">Platform chat:</span> Enable{" "}
              <code className="text-xs">platform_chat</code> in Admin for prospect conversation UI.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/playbooks">Manage playbooks</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Feature flags</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p>
            <span className="font-medium text-foreground">Automation:</span> Assist mode — drafts
            require approval before sending.
          </p>
          <p>
            <span className="font-medium text-foreground">Outreach:</span> Warm path preferred.
          </p>
          <p>
            <span className="font-medium text-foreground">Platform chat:</span> Enable in Admin.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" className="w-full rounded-xl" asChild>
              <Link href="/playbooks">Manage playbooks</Link>
            </Button>
            <Button variant="outline" className="w-full rounded-xl" asChild>
              <Link href="/admin">Feature flags</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const notificationItems = [
    { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
    { key: "intros" as const, label: "Introduction updates", desc: "When intro requests change status" },
    { key: "sync" as const, label: "Sync completions", desc: "When contact sync jobs finish" },
  ];

  const notificationsPanel = isMobileApp ? (
    <div className="mobile-menu-list">
      {notificationItems.map((item) => (
        <div key={item.key} className="mobile-list-row">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <Switch
            checked={notifications[item.key]}
            onCheckedChange={(checked) => updateNotification(item.key, checked)}
          />
        </div>
      ))}
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
        <CardDescription>Choose what you want to be notified about</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={notifications[item.key]}
              onCheckedChange={(checked) => updateNotification(item.key, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const appearancePanel = isMobileApp ? (
    <div className="space-y-3">
      <div className="mobile-card-flat p-4">
        <p className="mb-3 text-sm font-medium">Theme</p>
        <div className="mobile-segmented">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-active={theme === t}
              className="mobile-segmented-item capitalize"
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="mobile-list-row mobile-menu-list">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Compact mode</p>
          <p className="text-xs text-muted-foreground">Reduce spacing in the UI</p>
        </div>
        <Switch checked={compactMode} onCheckedChange={setCompactMode} />
      </div>
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
        <CardDescription>Customize how Potentially looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Select light or dark mode</p>
          </div>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Compact mode</p>
            <p className="text-xs text-muted-foreground">Reduce spacing in the UI</p>
          </div>
          <Switch checked={compactMode} onCheckedChange={setCompactMode} />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  if (isMobileApp) {
    return (
      <div className="space-y-4 pb-24">
        <MobileSegmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "profile", label: "Profile" },
            { value: "email", label: "Email" },
            { value: "playbooks", label: "Playbooks" },
            { value: "notifications", label: "Alerts" },
            { value: "appearance", label: "Look" },
          ]}
        />
        {activeTab === "profile" && profilePanel}
        {activeTab === "email" && emailPanel}
        {activeTab === "playbooks" && playbooksPanel}
        {activeTab === "notifications" && notificationsPanel}
        {activeTab === "appearance" && appearancePanel}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">Manage your account and preferences</p>
      </DesktopOnly>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">{profilePanel}</TabsContent>
        <TabsContent value="email">{emailPanel}</TabsContent>
        <TabsContent value="playbooks">{playbooksPanel}</TabsContent>
        <TabsContent value="notifications">{notificationsPanel}</TabsContent>
        <TabsContent value="appearance">{appearancePanel}</TabsContent>
      </Tabs>
    </div>
  );
}
