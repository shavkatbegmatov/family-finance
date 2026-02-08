import {
  Wallet, Briefcase, TrendingUp, Laptop, Gift, PlusCircle,
  ShoppingCart, Truck, Home, Key, ShoppingBag, Heart,
  BookOpen, Film, Wifi, Scissors, MoreHorizontal, HelpCircle,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  'wallet': Wallet,
  'briefcase': Briefcase,
  'trending-up': TrendingUp,
  'laptop': Laptop,
  'gift': Gift,
  'plus-circle': PlusCircle,
  'shopping-cart': ShoppingCart,
  'truck': Truck,
  'home': Home,
  'key': Key,
  'shopping-bag': ShoppingBag,
  'heart': Heart,
  'book-open': BookOpen,
  'film': Film,
  'wifi': Wifi,
  'scissors': Scissors,
  'more-horizontal': MoreHorizontal,
};

export function getCategoryIcon(name?: string | null, color?: string | null, className = 'h-4 w-4') {
  if (!name) return null;
  const Icon = ICON_MAP[name] || HelpCircle;
  return <Icon className={className} style={color ? { color } : undefined} />;
}
