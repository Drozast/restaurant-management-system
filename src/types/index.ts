export interface Reward {
  id: number;
  title: string;
  description: string;
  icon: string;
  active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardInput {
  title: string;
  description: string;
  icon?: string;
  created_by: string;
}

export interface UpdateRewardInput {
  title: string;
  description: string;
  icon: string;
}
