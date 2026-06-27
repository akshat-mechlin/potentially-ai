"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { useUIStore } from "@/stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const SETTINGS_KEY = "potentially-notification-prefs";

type NotificationPrefs = {
  email: boolean;
  intros: boolean;
  sync: boolean;
};

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
  const { theme, setTheme } = useTheme();
  const { compactMode, setCompactMode } = useUIStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [notifications, setNotifications] = useState(readNotificationPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (profile) {
          setName(profile.name || "");
          setEmail(profile.email || "");
          setTitle(profile.title || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, title }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(notifications));
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sub text-muted-foreground">Manage your account and preferences</p>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
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
                  placeholder="CEO at Acme Ventures"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
                { key: "intros" as const, label: "Introduction updates", desc: "When intro requests change status" },
                { key: "sync" as const, label: "Sync completions", desc: "When contact sync jobs finish" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) => {
                      const next = { ...notifications, [item.key]: checked };
                      setNotifications(next);
                      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
