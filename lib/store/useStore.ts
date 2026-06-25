import { create } from 'zustand';

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

export const useStore = create<AppState>((set) => ({
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
  unreadNotifications: 0,
  isDarkMode: false,
  currency: 'USD',

  setSummary: (s) => set(s),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setCurrency: (currency) => set({ currency }),
}));