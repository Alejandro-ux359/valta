import { create } from "zustand";
import { Appearance } from "react-native";

interface Summary {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}

export interface UserCurrency {
  code: string;
  label: string;
  symbol: string;
}

interface AppState {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  unreadNotifications: number;
  isDarkMode: boolean;
  currency: string;
  userCurrencies: UserCurrency[];
  // Tarjeta activa por moneda: { 'CUP': 1, 'USD': 3 }
  activeCardByCurrency: Record<string, number>;

  setSummary: (s: Summary) => void;
  setUnreadNotifications: (n: number) => void;
  toggleDarkMode: () => void;
  setCurrency: (c: string) => void;
  setUserCurrencies: (currencies: UserCurrency[]) => void;
  setActiveCard: (currency: string, cardId: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
  unreadNotifications: 0,
  isDarkMode: Appearance.getColorScheme() === "dark",
  currency: "CUP",
  userCurrencies: [{ code: "CUP", label: "Peso Cubano", symbol: "$" }],
  activeCardByCurrency: {},

  setSummary: (s) => set(s),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    Appearance.setColorScheme(next ? "dark" : "light");
  },
  setCurrency: (currency) => set({ currency }),
  setUserCurrencies: (userCurrencies) => set({ userCurrencies }),
  setActiveCard: (currency, cardId) =>
    set((state) => ({
      activeCardByCurrency: {
        ...state.activeCardByCurrency,
        [currency]: cardId,
      },
    })),
}));
