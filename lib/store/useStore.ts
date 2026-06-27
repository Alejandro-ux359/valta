import { create } from "zustand";
import { Appearance } from "react-native";

interface Summary {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}

interface AppState {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  unreadNotifications: number;
  isDarkMode: boolean;
  currency: string;

  setSummary: (s: Summary) => void;
  setUnreadNotifications: (n: number) => void;
  toggleDarkMode: () => void;
  setCurrency: (c: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
  unreadNotifications: 0,
  isDarkMode: Appearance.getColorScheme() === "dark",
  currency: "CUP",

  setSummary: (s) => set(s),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    Appearance.setColorScheme(next ? "dark" : "light");
  },
  setCurrency: (currency) => set({ currency }),
}));
