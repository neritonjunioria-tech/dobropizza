import { MenuItem, ExtraIngredient } from './data/menu';
export type { MenuItem, ExtraIngredient };

export type PizzaSize = 'P' | 'M' | 'G' | 'Big' | 'Super Big';

export interface CartItem {
  id: string; // Unique ID for this specific cart entry (e.g., simple timestamp or composite)
  menuItem: MenuItem;
  size?: PizzaSize; // Only for pizzas
  isHalfAndHalf?: boolean; // Only for G pizzas
  halfAndHalfFlavor?: MenuItem; // The second flavor if isHalfAndHalf is true
  quantity: number;
  notes?: string;
  extras?: ExtraIngredient[]; // Extra ingredients added to the pizza
  priceCalculated: number; // Price per item calculated based on size or half-and-half rules
}

export type DeliveryMethod = 'delivery' | 'pickup';

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  method: DeliveryMethod;
  neighborhood: string; // For delivery fee calculation
  address: string;
  paymentMethod: 'pix' | 'dinheiro' | 'credito' | 'debito' | 'mbway' | string;
  changeFor?: string; // If cash (money)
  notes?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}
