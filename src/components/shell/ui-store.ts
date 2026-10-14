import { create } from "zustand"

interface ShellState {
    collapsed: boolean
    mobileOpen: boolean
    toggleCollapsed: () => void
    setMobileOpen: (v: boolean) => void
}

export const useShell = create<ShellState>((set) => ({
    collapsed: false,
    mobileOpen: false,
    toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}))
