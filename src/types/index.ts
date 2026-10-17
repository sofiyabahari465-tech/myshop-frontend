export type UserRole =
  | 'admin'
  | 'user'
  | 'representative';

export type Section =
  | 'dashboard'
  | 'products'
  | 'representatives'
  | 'upload'
  | 'shipments'
  | 'my-shipments'
  | 'warehouse'
  | 'reports'
  | 'sales-reports'
  | 'users'
  | 'settings'
  | 'orders'
  | 'profile'
  | 'return-request'
  | 'return-requests'
  | 'support'
  | 'support-requests'
  | 'notes'
  | 'warranties';

export interface Product {
  id: string;
  name: string;
  productName?: string;
  title?: string;
  price: number;
  category?: string;
  stock?: number;
  description?: string;
  image?: string;
  updatedAt?: string;
  brand?: string;
  brandName?: string;
}

export type RepresentativeStatus =
  | 'active'
  | 'inactive';

export interface Representative {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  province?: string;
  city?: string;
  code?: string | number;
  address?: string;
  description?: string;
  shopDescription?: string;
  orders?: number;
  status?: RepresentativeStatus;
  startDate?: string;
  depositAmount?: string | number;
  guaranteeCheck?: string | number;
  totalFinancialCommitment?: string | number;
  shipmentsCount?: number;
  storeItemsCount?: number;
  storeItemsTotalValue?: number;
  returnRequestsCount?: number;
  last10DaysSales?: number;
  averageSales?: number;
  // 🆕 فیلدهای جدید برای اعلام فروش
  salesAnnouncementCount?: number;
  lastSalesAnnouncementDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RepresentativeFormData {
  name: string;
  email: string;
  code: string;
  province: string;
  city: string;
  phone: string;
  startDate: string;
  status: RepresentativeStatus;
  address: string;
  description: string;
  shopDescription: string;
}

export interface RepresentativeFormState
  extends RepresentativeFormData {
  orders: number;
  depositAmount: string;
  guaranteeCheck: string;
  totalFinancialCommitment: string;
  shipmentsCount: number;
  storeItemsCount: number;
  storeItemsTotalValue: number;
  returnRequestsCount: number;
  last10DaysSales: number;
  averageSales: number;
  // 🆕 فیلدهای جدید برای اعلام فروش (اختیاری)
  salesAnnouncementCount?: number;
  lastSalesAnnouncementDate?: string;
}

export interface RepresentativePayload {
  name: string;
  email: string;
  code: string;
  province: string;
  city: string;
  phone: string;
  startDate: string;
  status: RepresentativeStatus;
  address: string;
  description: string;
  shopDescription: string;
  orders: number;
  depositAmount: string;
  guaranteeCheck: string;
  totalFinancialCommitment: string;
  shipmentsCount: number;
  storeItemsCount: number;
  storeItemsTotalValue: number;
  returnRequestsCount: number;
  last10DaysSales: number;
  averageSales: number;
  // 🆕 فیلدهای جدید برای اعلام فروش
  salesAnnouncementCount?: number;
  lastSalesAnnouncementDate?: string;
}

export type CreateRepresentativePayload =
  RepresentativePayload;

export type UpdateRepresentativePayload =
  RepresentativePayload;

export interface RepresentativeAdminNote {
  id: string;
  representativeId: string | number;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RepresentativeFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  representativeId: string | number;
  icon: string;
}

export interface RepresentativeWarehouseItem {
  id: string;
  productId: string;
  productName: string;
  brand?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  minimumStock: number;
  status: 'normal' | 'low' | 'out';
  lastUpdated: string;
}

export interface RepresentativeWarehouseMovement {
  id: string;
  representativeId: string | number;
  productId: string;
  productName: string;
  brand?: string;
  category?: string;
  type: 'in' | 'out';
  quantity: number;
  unitPrice: number;
  rowTotal?: number;
  originalQuantity?: number;
  rejectedQuantity?: number;
  reason: string;
  description: string;
  createdAt: string;
}

export interface RepresentativeWarehouseSummary {
  storeItemsCount: number;
  storeItemsTotalValue: number;
}

export interface RepresentativeWarehouseData {
  representativeId: string | number;
  items: RepresentativeWarehouseItem[];
  movements: RepresentativeWarehouseMovement[];
  importedFiles?: unknown[];
  updatedAt: string | null;
  summary?: RepresentativeWarehouseSummary;
}

export interface RepresentativeAdminWarehouseData
  extends RepresentativeWarehouseData {
  representative: Representative;
  province: string;
  city: string;
  locationLabel: string;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export interface SalesReportItem {
  id?: string | number;
  productId?: string | number;
  productName?: string;
  name?: string;
  title?: string;
  brand?: string;
  brandName?: string;
  quantity?: number;
  count?: number;
  price?: number;
  unitPrice?: number;
  totalPrice?: number;
  total?: number;
  [key: string]: unknown;
}

export interface SalesReport {
  id?: string | number;
  representativeId?: string | number;
  representativeName?: string;
  userId?: string | number;
  userName?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  total?: number;
  totalAmount?: number;
  items?: SalesReportItem[];
  [key: string]: unknown;
}

export interface ReturnRequestItem {
  id?: string | number;
  productId?: string | number;

  productName?: string;
  name?: string;
  title?: string;

  productBrand?: string;
  brand?: string;
  brandName?: string;

  productCategory?: string;
  category?: string;

  quantity?: number;
  price?: number;
  unitPrice?: number;
  total?: number;
  totalPrice?: number;

  representativeCode?: string | number;
  representativeCity?: string;
  returnDate?: string;

  reason?: string;
  description?: string;

  [key: string]: unknown;
}

export interface ReturnRequest {
  id: string | number;

  representativeId?: string | number;
  representativeName?: string;
  representativeCode?: string | number;
  representativeCity?: string;

  userId?: string | number;
  userName?: string;

  productName?: string;
  name?: string;
  title?: string;

  productBrand?: string;
  brand?: string;
  brandName?: string;

  productCategory?: string;
  category?: string;

  quantity?: number;
  price?: number;
  unitPrice?: number;
  total?: number;
  totalPrice?: number;

  status?: string;
  reason?: string;
  description?: string;

  returnDate?: string;
  createdAt?: string;
  updatedAt?: string;

  items?: ReturnRequestItem[];

  [key: string]: unknown;
}