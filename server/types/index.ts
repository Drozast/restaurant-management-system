export interface Ingredient {
  id?: number;
  name: string;
  unit: string;
  current_percentage: number;
  critical_threshold: number;
  warning_threshold: number;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id?: number;
  name: string;
  type: 'pizza' | 'tabla';
  active: number;
  created_at?: string;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id?: number;
  recipe_id: number;
  ingredient_id: number;
  quantity: number;
  ingredient_name?: string;
  ingredient_unit?: string;
}

export interface Shift {
  id?: number;
  date: string;
  type: 'AM' | 'PM';
  employee_name: string;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed';
  created_at?: string;
  tasks?: ShiftTask[];
}

export interface ShiftTask {
  id?: number;
  shift_id: number;
  task_name: string;
  completed: number;
  completed_at?: string;
}

export interface Sale {
  id?: number;
  shift_id: number;
  recipe_id: number;
  quantity: number;
  timestamp?: string;
  recipe_name?: string;
  recipe_type?: string;
}

export interface Alert {
  id?: number;
  type: 'critical' | 'warning' | 'info' | 'suggestion';
  message: string;
  ingredient_id?: number;
  priority: number;
  resolved: number;
  created_at?: string;
  resolved_at?: string;
  ingredient_name?: string;
}

export interface Restock {
  id?: number;
  ingredient_id: number;
  previous_percentage: number;
  new_percentage: number;
  authorized_by: string;
  shift_id?: number;
  timestamp?: string;
}

export interface WeeklyAchievement {
  id?: number;
  week_start: string;
  week_end: string;
  employee_name: string;
  tasks_completed: number;
  total_tasks: number;
  premio?: string;
  created_at?: string;
}
