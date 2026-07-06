import { FEATURE_FLAG_CATALOG } from "@/lib/admin/feature-flags-catalog";

type DemoAdminUser = {
  id: string;
  name: string;
  email: string;
  workspaces: number;
  admin: boolean;
};

type DemoWorkspace = {
  id: string;
  name: string;
  members: number;
  plan: string;
  contacts: number;
};

const initialUsers: DemoAdminUser[] = [
  { id: "demo-user-001", name: "Alex Morgan", email: "demo@potentially.ai", workspaces: 1, admin: false },
  { id: "demo-admin-001", name: "Admin User", email: "admin@potentially.ai", workspaces: 1, admin: true },
];

const initialWorkspaces: DemoWorkspace[] = [
  { id: "demo-workspace-001", name: "Acme Ventures", members: 1, plan: "pro", contacts: 3 },
];

const initialFlags: Record<string, boolean> = Object.fromEntries(
  Object.keys(FEATURE_FLAG_CATALOG).map((key) => [
    key,
    !["beta_connectors", "platform_chat"].includes(key),
  ]),
);

let demoUsers = [...initialUsers];
let demoWorkspaces = [...initialWorkspaces];
let demoFeatureFlags = { ...initialFlags };

export function getDemoAdminUsers() {
  return demoUsers.map((user) => ({ ...user }));
}

export function getDemoAdminWorkspaces() {
  return demoWorkspaces.map((workspace) => ({ ...workspace }));
}

export function getDemoFeatureFlags() {
  return Object.entries(demoFeatureFlags).map(([key, enabled]) => ({
    key,
    enabled,
    description: FEATURE_FLAG_CATALOG[key]?.description ?? null,
  }));
}

export function updateDemoFeatureFlag(key: string, enabled: boolean) {
  demoFeatureFlags = { ...demoFeatureFlags, [key]: enabled };
  return { key, enabled };
}

export function updateDemoUserAdmin(userId: string, isAdmin: boolean) {
  demoUsers = demoUsers.map((user) =>
    user.id === userId ? { ...user, admin: isAdmin } : user,
  );
  const updated = demoUsers.find((user) => user.id === userId);
  if (!updated) throw new Error("User not found");
  return updated;
}

export function updateDemoWorkspacePlan(workspaceId: string, plan: string) {
  demoWorkspaces = demoWorkspaces.map((workspace) =>
    workspace.id === workspaceId ? { ...workspace, plan } : workspace,
  );
  const updated = demoWorkspaces.find((workspace) => workspace.id === workspaceId);
  if (!updated) throw new Error("Group not found");
  return updated;
}
