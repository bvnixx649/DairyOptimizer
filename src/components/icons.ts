import {
  Apple, Bed, BookOpen, Brain, Briefcase, Bus, Code, Coffee, Coins, Droplet, Dumbbell, Footprints, Gamepad2,
  GraduationCap, HandCoins, Heart, HeartPulse, House, Laptop, Leaf, type LucideIcon, Moon, Music, NotebookPen,
  Package, PenLine, PiggyBank, Receipt, ShoppingBag, Sparkles, Sun, Sunrise, Utensils, VibrateOff, Wallet,
  Languages, Bike, Salad, BellOff, Smile,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  'vibrate-off': VibrateOff,
  'bell-off': BellOff,
  'shopping-bag': ShoppingBag,
  'book-open': BookOpen,
  'notebook-pen': NotebookPen,
  'pen-line': PenLine,
  code: Code,
  languages: Languages,
  brain: Brain,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  droplet: Droplet,
  salad: Salad,
  apple: Apple,
  bed: Bed,
  moon: Moon,
  sun: Sun,
  sunrise: Sunrise,
  music: Music,
  heart: Heart,
  smile: Smile,
  leaf: Leaf,
  'piggy-bank': PiggyBank,
  wallet: Wallet,
  sparkles: Sparkles,
  coffee: Coffee,
  // money categories
  utensils: Utensils,
  bus: Bus,
  'graduation-cap': GraduationCap,
  gamepad: Gamepad2,
  'heart-pulse': HeartPulse,
  house: House,
  receipt: Receipt,
  package: Package,
  'hand-coins': HandCoins,
  briefcase: Briefcase,
  laptop: Laptop,
  coins: Coins,
}

export const HABIT_ICONS = [
  'vibrate-off', 'shopping-bag', 'book-open', 'notebook-pen', 'code', 'languages', 'brain', 'dumbbell',
  'footprints', 'bike', 'droplet', 'salad', 'bed', 'moon', 'sunrise', 'music', 'heart', 'smile', 'piggy-bank', 'sparkles',
]

export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Sparkles
