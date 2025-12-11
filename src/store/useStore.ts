import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  rut: string;
  name: string;
  role: 'empleado' | 'chef';
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_percentage: number;
  critical_threshold: number;
  warning_threshold: number;
  category: string;
}

interface Recipe {
  id: number;
  name: string;
  type: 'pizza' | 'tabla';
  ingredients: any[];
}

interface Shift {
  id: number;
  date: string;
  type: 'AM' | 'PM';
  employee_name: string;
  status: 'open' | 'closed';
  tasks: any[];
}

interface Alert {
  id: number;
  type: 'critical' | 'warning' | 'info' | 'suggestion';
  message: string;
  priority: number;
  resolved: number;
  created_at: string;
}

interface Store {
  user: User | null;
  ingredients: Ingredient[];
  recipes: Recipe[];
  currentShift: Shift | null;
  alerts: Alert[];
  setUser: (user: User | null) => void;
  setIngredients: (ingredients: Ingredient[]) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setCurrentShift: (shift: Shift | null) => void;
  setAlerts: (alerts: Alert[]) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: number) => void;
  logout: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: null,
      ingredients: [],
      recipes: [],
      currentShift: null,
      alerts: [],

      setUser: (user) => set({ user }),
      setIngredients: (ingredients) => set({
        ingredients: Array.isArray(ingredients) ? ingredients : []
      }),
      setRecipes: (recipes) => set({ recipes }),
      setCurrentShift: (currentShift) => set({ currentShift }),
      setAlerts: (alerts) => set({ alerts }),

      updateIngredient: (ingredient) =>
        set((state) => ({
          ingredients: Array.isArray(state.ingredients)
            ? state.ingredients.map((i) => i.id === ingredient.id ? ingredient : i)
            : [],
        })),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts],
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      logout: () => set({ user: null, currentShift: null }),
    }),
    {
      name: 'pizza-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
