import {
  Wallet, Briefcase, TrendingUp, Laptop, Gift, PlusCircle,
  ShoppingCart, Truck, Home, Key, ShoppingBag, Heart,
  BookOpen, Film, Wifi, Scissors, MoreHorizontal, HelpCircle,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  'wallet':          { icon: Wallet,         color: '#22c55e' },
  'briefcase':       { icon: Briefcase,      color: '#3b82f6' },
  'trending-up':     { icon: TrendingUp,     color: '#14b8a6' },
  'laptop':          { icon: Laptop,         color: '#8b5cf6' },
  'gift':            { icon: Gift,           color: '#ec4899' },
  'plus-circle':     { icon: PlusCircle,     color: '#6366f1' },
  'shopping-cart':   { icon: ShoppingCart,    color: '#f97316' },
  'truck':           { icon: Truck,          color: '#0ea5e9' },
  'home':            { icon: Home,           color: '#eab308' },
  'key':             { icon: Key,            color: '#a855f7' },
  'shopping-bag':    { icon: ShoppingBag,    color: '#d946ef' },
  'heart':           { icon: Heart,          color: '#ef4444' },
  'book-open':       { icon: BookOpen,       color: '#06b6d4' },
  'film':            { icon: Film,           color: '#f59e0b' },
  'wifi':            { icon: Wifi,           color: '#3b82f6' },
  'scissors':        { icon: Scissors,       color: '#f43f5e' },
  'more-horizontal': { icon: MoreHorizontal, color: '#84cc16' },
};

export function getCategoryIcon(name?: string | null, color?: string | null, className = 'h-4 w-4') {
  if (!name) return null;
  const entry = ICON_MAP[name];
  const Icon = entry?.icon || HelpCircle;
  const iconColor = color || entry?.color;
  return <Icon className={className} style={iconColor ? { color: iconColor } : undefined} />;
}
