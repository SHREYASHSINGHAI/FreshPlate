export type FreshnessStatus = 'fresh' | 'expiring_soon' | 'stale';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: string;
  purchaseDate: string; // ISO string
  estimatedExpiryDate: string; // ISO string
  status: FreshnessStatus;
  source: string; // e.g., 'Blinkit', 'Zepto', 'Instamart', 'Amazon Fresh', 'Manual'
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  difficulty: string;
  matchesExpiring: boolean;
  usedIngredientIds?: string[];
  missingIngredients?: string[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  addedAt: string; // ISO string
  completed: boolean;
}

export interface HouseholdMember {
  memberUid: string;
  inviteCode: string;
  joinedAt?: any;
  email?: string;
}

export interface HouseholdInvite {
  targetUid: string;
  createdAt: any;
}
