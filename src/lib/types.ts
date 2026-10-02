export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  order: number
  productCount?: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string | null
  details?: string | null
  price: number
  oldPrice?: number | null
  image: string
  gallery: string
  categoryId?: string | null
  category?: Category | null
  stock: number
  rating: number
  reviewCount: number
  soldCount?: number
  isFeatured: boolean
  isNew: boolean
  isActive: boolean
  sizes: string
  colors: string
}

export interface OrderItem {
  id: string
  productId?: string | null
  name: string
  price: number
  image?: string | null
  quantity: number
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  phone?: string | null
  address: string
  city: string
  postalCode?: string | null
  country: string
  paymentMethod: string
  shippingMethod?: string
  subtotal: number
  shipping: number
  discount: number
  promoCode?: string | null
  total: number
  status: string
  pointsUsed?: number
  notes?: string | null
  items: OrderItem[]
  createdAt: string
}

export interface Review {
  id: string
  productId: string
  author: string
  email?: string | null
  rating: number
  title?: string | null
  content: string
  status: string
  helpfulCount?: number
  photos?: string
  createdAt: string
  product?: { id: string; name: string; image: string } | null
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject?: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export interface PromoCode {
  id: string
  code: string
  type: 'percent' | 'fixed' | 'shipping'
  value: number
  label: string
  active: boolean
  usageCount: number
  createdAt: string
}

export interface ProductQuestion {
  id: string
  productId: string
  author: string
  question: string
  answer?: string | null
  status: string
  helpfulCount?: number
  answeredAt?: string | null
  createdAt: string
  product?: { id: string; name: string; image: string } | null
}

export interface ActivityEvent {
  id: string
  type: 'order' | 'message' | 'review' | 'question'
  title: string
  detail: string
  createdAt: string
  href: string
}

export interface Stats {
  totalRevenue: number
  ordersCount: number
  productsCount: number
  categoriesCount: number
  pendingReviews: number
  lowStock: number
  revenueByDay: { date: string; total: number }[]
  ordersByStatus: { status: string; count: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  categoryDistribution: { name: string; value: number }[]
  salesByCategory: { name: string; ventes: number }[]
  unreadMessages: number
  subscribers: number
  pendingQuestions?: number
}

export type PageName =
  | 'home'
  | 'shop'
  | 'categories'
  | 'promotions'
  | 'about'
  | 'contact'
  | 'faq'
  | 'guide-tailles'
  | 'terms'
  | 'privacy'
  | 'product'
  | 'login'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'order-detail'
  | 'tracking'
  | 'wishlist'
  | 'order-confirmation'
  | 'fidelite'
  | 'admin'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-categories'
  | 'admin-orders'
  | 'admin-reviews'
  | 'admin-inventory'
  | 'admin-messages'
  | 'admin-emails'
  | 'admin-promos'

export interface RouteState {
  page: PageName
  params: Record<string, string>
}

export const STATUS_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
}

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  confirmee: 'bg-blue-100 text-blue-800',
  expediee: 'bg-indigo-100 text-indigo-800',
  livree: 'bg-green-100 text-green-800',
  annulee: 'bg-red-100 text-red-800',
}
