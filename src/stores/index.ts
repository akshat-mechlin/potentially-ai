import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace, SearchResult } from "@/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  removeWorkspace: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      removeWorkspace: (workspaceId) =>
        set((state) => {
          const workspaces = state.workspaces.filter((workspace) => workspace.id !== workspaceId);
          const currentWorkspace =
            state.currentWorkspace?.id === workspaceId
              ? (workspaces[0] ?? null)
              : state.currentWorkspace;
          return { workspaces, currentWorkspace };
        }),
    }),
    { name: "potentially-workspace" },
  ),
);

interface SearchState {
  query: string;
  results: SearchResult | null;
  isSearching: boolean;
  history: string[];
  setQuery: (query: string) => void;
  setResults: (results: SearchResult | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  addToHistory: (query: string) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: null,
  isSearching: false,
  history: [],
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setIsSearching: (isSearching) => set({ isSearching }),
  addToHistory: (query) => {
    const history = get().history.filter((q) => q !== query);
    set({ history: [query, ...history].slice(0, 20) });
  },
  clearResults: () => set({ results: null, query: "" }),
}));

interface UIState {
  sidebarOpen: boolean;
  commandMenuOpen: boolean;
  compactMode: boolean;
  mobileMoreOpen: boolean;
  mobileHeaderTitle: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandMenuOpen: (open: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;
  setMobileHeaderTitle: (title: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      commandMenuOpen: false,
      compactMode: false,
      mobileMoreOpen: false,
      mobileHeaderTitle: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setMobileMoreOpen: (open) => set({ mobileMoreOpen: open }),
      setMobileHeaderTitle: (mobileHeaderTitle) => set({ mobileHeaderTitle }),
    }),
    {
      name: "potentially-ui",
      partialize: (state) => ({
        compactMode: state.compactMode,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
