const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";
export { API_BASE_URL };

export interface Destination {
  id: number;
  name: string;
  country: string;
  continent: string;
  categories: string[];
  description: string;
  image: string;
  status: "Featured" | "Active" | "Hidden";
  rating: number;
  reviews: number;
  bestSeason: string;
  highlights: string;
}

export interface TourPackage {
  id: number;
  name: string;
  category: string;
  destinations: string[];
  duration: number;
  price: number;
  maxGroup: number;
  difficulty: "Easy" | "Moderate" | "Challenging";
  status: "Active" | "Draft" | "Archived";
  rating: number;
  reviews: number;
  bookings: number;
  image: string;
  included: string;
  description: string;
}

export interface Booking {
  id: string;
  bookingType?: "PACKAGE" | "ACCOMMODATION" | "VEHICLE" | "CUSTOM";
  packageId?: number | null;
  languagePreference?: string;
  guest: string;
  email: string;
  destination: string;
  pkg: string;
  guide: string;
  guideSelectionType?: "VOYARA" | "OWN";
  guideId?: number | null;
  accommodation: string;
  accommodationSelectionType?: "VOYARA" | "OWN";
  accommodationId?: number | null;
  roomType?: string;
  vehicle: string;
  vehicleSelectionType?: "VOYARA" | "OWN";
  vehicleId?: number | null;
  pickupLocation?: string;
  pickupTime?: string;
  returnLocation?: string;
  returnTime?: string;
  driverRequired?: boolean;
  luggageCount?: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
  total: number;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  accommodationProviderStatus?: "Pending" | "Confirmed" | "Rejected" | null;
  vehicleProviderStatus?: "Pending" | "Confirmed" | "Rejected" | null;
  payment: "Paid" | "Pending" | "Refunded";
  overallRating?: number | null;
  overallRatingDescription?: string;
  overallReview?: string;
  notes: string;
  createdAt: string;
}

export interface Guide {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  userId?: number | null;
  nationality?: string;
  profilePhoto?: string;
  initials: string;
  color: string;
  location: string;
  country: string;
  specialties: string[];
  languages: string[];
  rating: number;
  reviews: number;
  pricePerDay: number;
  experience: number;
  status: "Available" | "Unavailable" | "On Leave" | "Busy" | "Offline";
  bio: string;
  toursCompleted: number;
}

export const TOUR_GUIDE_SPECIALTIES = ["City Tours", "Cultural Tours", "Nature", "Food Tours", "Hiking", "Water Sports", "Wildlife", "Arts", "Photography", "Wellness", "History", "Heritage", "Architecture", "Sailing", "Spiritual", "Adventure", "Other", "Culture", "Temple Tours"] as const;
export const TOUR_GUIDE_LANGUAGES = ["English", "French", "Spanish", "Japanese", "Korean", "Chinese", "Arabic", "German", "Italian", "Indonesian", "Greek", "Swahili", "Portuguese"] as const;
const specialtyAliases: Record<string, string> = { Cultural: "Cultural Tours", "Food & Drink": "Food Tours" };
export function normalizeTourGuideSpecialty(value: string) { return specialtyAliases[value] || value; }
export function normalizeTourGuideSpecialties(values: string[] = []) { return Array.from(new Set(values.map(normalizeTourGuideSpecialty))); }

export interface AdminTourist {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  active: boolean;
  emailVerified: boolean;
  nationality?: string;
  passportNumber?: string;
  preferences?: string;
  createdAt?: string;
}

export interface Accommodation {
  id: number;
  ownerUserId?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  name: string;
  type: "Hotel" | "Villa" | "Resort" | "Hostel" | "Apartment";
  destinationId?: number | null;
  location: string;
  country: string;
  price: number;
  rooms: number;
  availableRooms: number;
  rating: number;
  reviews: number;
  status: "Active" | "Inactive" | "Maintenance" | "Pending Approval" | "Rejected";
  amenities: string[];
  image: string;
  occupancy?: number;
}

export interface Vehicle {
  id: number;
  ownerUserId?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  name: string;
  brand: string;
  model: string;
  year: number;
  type: "Car" | "SUV" | "Van" | "Minibus" | "Motorbike" | "Luxury";
  capacity: number;
  luggageCapacity?: number;
  pricePerDay: number;
  rating: number;
  reviews: number;
  status: "Available" | "Rented" | "Maintenance" | "Pending Approval" | "Rejected" | "Inactive";
  transmission: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  features: string[];
  location: string;
  image: string;
  mileage: number;
  plate: string;
}

type ApiErrorBody = { message?: string; error?: string };
type ResourcePayload<T extends { id: string | number }> = Omit<T, "id"> & Partial<Pick<T, "id">>;

const PUBLIC_GET_PATHS = [
  "/destinations",
  "/packages",
  "/accommodations",
  "/tour-guides",
  "/vehicles",
  "/reviews",
  "/ai-chat/welcome",
  "/ai-chat/suggestions",
];

const AUTH_REQUIRED_WRITE_PATHS = [
  "/destinations",
  "/packages",
  "/bookings",
  "/accommodations",
  "/tour-guides",
  "/vehicles",
  "/tourist",
];

function isPublicGetRequest(path: string, method: string) {
  if (method.toUpperCase() !== "GET") return false;
  return PUBLIC_GET_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`) || path.startsWith(`${publicPath}?`));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const token = sessionStorage.getItem("voyara_token");
  const publicGetRequest = isPublicGetRequest(path, method);
  const authRequiredRequest = !publicGetRequest && AUTH_REQUIRED_WRITE_PATHS.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`));
  if (authRequiredRequest && !token) {
    sessionStorage.removeItem("voyara_user");
    throw new Error("Please log in again as an authorized user.");
  }

  const shouldAttachToken = token && !publicGetRequest;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(shouldAttachToken ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem("voyara_user");
      sessionStorage.removeItem("voyara_token");
      window.dispatchEvent(new Event("voyara:auth-expired"));
    }
    let body: ApiErrorBody = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    throw new Error(body.message || body.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function resource<T extends { id: Id }, Id extends string | number>(path: string) {
  return {
    list: () => request<T[]>(path),
    get: (id: Id) => request<T>(`${path}/${id}`),
    create: (payload: ResourcePayload<T>) => request<T>(path, { method: "POST", body: JSON.stringify(payload) }),
    update: (id: Id, payload: ResourcePayload<T>) => request<T>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id: Id) => request<void>(`${path}/${id}`, { method: "DELETE" }),
  };
}

export const destinationsApi = resource<Destination, number>("/destinations");
export const packagesApi = resource<TourPackage, number>("/packages");
export const adminPackagesApi = {
  list: () => request<TourPackage[]>("/admin/packages"),
  get: (id: number) => request<TourPackage>(`/admin/packages/${id}`),
  create: (payload: ResourcePayload<TourPackage>) => request<TourPackage>("/packages", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: number, payload: ResourcePayload<TourPackage>) => request<TourPackage>(`/packages/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id: number) => request<void>(`/packages/${id}`, { method: "DELETE" }),
};
export const bookingsApi = resource<Booking, string>("/bookings");
export const touristBookingsApi = {
  list: () => request<Booking[]>("/tourist/bookings"),
  detail: (id: string) => request<Booking>(`/tourist/bookings/${id}`),
  create: (payload: Partial<Booking>) => request<Booking>("/tourist/bookings", { method: "POST", body: JSON.stringify(payload) }),
  quote: (payload: Partial<Booking>) => request<BookingQuote>("/tourist/bookings/quote", { method: "POST", body: JSON.stringify(payload) }),
  cancel: (id: string) => request<Booking>(`/tourist/bookings/${id}/cancel`, { method: "PATCH" }),
  payment: (id: string) => request<Payment | null>(`/tourist/bookings/${id}/payment`),
  paymentOptions: (id: string) => request<{ demoEnabled: boolean }>(`/tourist/bookings/${id}/payment/options`),
  pay: (id: string, payload: DemoPaymentRequest) => request<Payment>(`/tourist/bookings/${id}/payment`, { method: "POST", body: JSON.stringify(payload) }),
};
export interface BookingQuote { total: number; bookingType: string; rooms: number; guests: number; nights: number; }
export interface DemoPaymentRequest { paymentMethod: string; cardholderName: string; cardNumber: string; expiryMonth: string; expiryYear: string; cvv: string; }
export interface Payment { id: number; amount: number; paymentMethod: string; cardBrand?: string; cardLast4?: string; status: "Paid" | "Pending" | "Failed"; transactionReference: string; paidAt: string; }
export const touristProfileApi = {
  get: () => request<{ id: number; fullName: string; email: string; phone?: string; nationality?: string; passportNumber?: string; preferences?: string; languages?: string[] }>('/tourist/profile'),
  update: (payload: { fullName: string; phone?: string; nationality?: string; passportNumber?: string; preferences?: string; languages?: string[] }) => request<{ id: number; fullName: string; email: string; phone?: string; nationality?: string; passportNumber?: string; preferences?: string; languages?: string[] }>('/tourist/profile', { method: 'PUT', body: JSON.stringify(payload) }),
};
export const adminTouristsApi = {
  list: () => request<AdminTourist[]>('/admin/tourists'),
  update: (id: number, payload: Omit<AdminTourist, 'id' | 'createdAt' | 'emailVerified'>) => request<AdminTourist>(`/admin/tourists/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: number) => request<void>(`/admin/tourists/${id}`, { method: 'DELETE' }),
};
export interface AccessPermission { id: number; code: string; label: string; }
export interface AccessRole { id: number; roleName: string; permissions: AccessPermission[]; }
export const accessControlApi = {
  roles: () => request<AccessRole[]>('/admin/access-control/roles'),
  permissions: () => request<AccessPermission[]>('/admin/access-control/permissions'),
  createRole: (payload: { roleName: string; permissionIds: number[] }) => request<AccessRole>('/admin/access-control/roles', { method: 'POST', body: JSON.stringify(payload) }),
  updateRole: (id: number, payload: { roleName: string; permissionIds: number[] }) => request<AccessRole>(`/admin/access-control/roles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeRole: (id: number) => request<void>(`/admin/access-control/roles/${id}`, { method: 'DELETE' }),
};
export interface Stakeholder { id: number; fullName: string; email: string; phone: string; stakeholderType: string; roleId: number | null; accessProfile: string; accountStatus: string; createdAt?: string; source?: "ACCOUNT" | "GUIDE_PROFILE"; location?: string; country?: string; }
export const stakeholdersApi = {
  list: () => request<Stakeholder[]>('/admin/stakeholders'),
  create: (payload: { fullName: string; email: string; phone: string; password: string; stakeholderType: string; roleId: number; accountStatus: string }) => request<Stakeholder>('/admin/stakeholders', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccess: (id: number, payload: { roleId: number; password?: string }) => request<Stakeholder>(`/admin/stakeholders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: number) => request<void>(`/admin/stakeholders/${id}`, { method: 'DELETE' }),
  profile: () => request<StakeholderProfile>('/stakeholder/profile'),
  updateProfile: (payload: { fullName: string; phone: string; profilePhoto?: string }) => request<StakeholderProfile>('/stakeholder/profile', { method: 'PUT', body: JSON.stringify(payload) }),
};
export interface StakeholderProfile { id: number; fullName: string; email: string; phone?: string; profilePhoto?: string; stakeholderType?: string; accountStatus?: string; roles: string[]; }
export const touristReviewsApi = {
  list: () => request<Review[]>('/tourist/reviews'),
  create: (bookingId: string, payload: { targetType: string; targetId?: number; rating: number; comment?: string }) => request<Review>(`/tourist/bookings/${bookingId}/reviews`, { method: 'POST', body: JSON.stringify(payload) }),
};
export interface Review { id: number; bookingId: string; targetType: string; targetId?: number; rating: number; comment?: string; createdAt: string; }
export interface ReviewSummary { averageRating: number; ratingCount: number; writtenReviewCount: number; reviews: Review[]; }
export interface TravelerStoryReview {
  id: number;
  reviewerName: string;
  reviewerInitials: string;
  targetType: string;
  targetId?: number;
  resourceName: string;
  destination?: string;
  rating: number;
  comment: string;
  createdAt: string;
}
export const reviewsApi = {
  recent: () => request<TravelerStoryReview[]>("/reviews"),
  byTarget: (targetType: "GUIDE" | "ACCOMMODATION" | "VEHICLE", targetId: number) => request<ReviewSummary | Review[]>(`/reviews/${targetType}/${targetId}`),
};
export interface Notification { id: number; title: string; message: string; type?: string; referenceId?: string; read: boolean; createdAt: string; }
export const notificationsApi = {
  list: () => request<Notification[]>('/notifications'),
  touristList: () => request<Notification[]>('/notifications/tourist'),
  markRead: (id: number) => request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<Notification[]>('/notifications/read-all', { method: 'PATCH' }),
  markAllTouristRead: () => request<Notification[]>('/notifications/tourist/read-all', { method: 'PATCH' }),
};
export interface DailyReport {
  date: string;
  summary: { activityCount: number; totalBookings: number; pending: number; confirmed: number; completed: number; cancelled: number; paidRevenue: number };
  resources: { destinations: number; packages: number; accommodations: number; activeAccommodations: number; guides: number; vehicles: number };
  bookings: Array<{ id: string; guest: string; email: string; packageName: string; destination: string; checkIn?: string; checkOut?: string; guests: number; total: number; status: string; payment: string; guide?: string; accommodation?: string; vehicle?: string; createdAt?: string }>;
}
export const reportsApi = {
  daily: (date?: string) => request<DailyReport>(`/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`),
};
export const guidesApi = {
  list: (params: { checkIn?: string; checkOut?: string; language?: string; location?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.checkIn) query.set("checkIn", params.checkIn);
    if (params.checkOut) query.set("checkOut", params.checkOut);
    if (params.language) query.set("language", params.language);
    if (params.location) query.set("location", params.location);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Guide[]>(`/tour-guides${suffix}`);
  },
  get: (id: number) => request<Guide>(`/tour-guides/${id}`),
};
export const adminGuidesApi = resource<Guide, number>("/admin/tour-guides");
export const stakeholderGuideProfileApi = {
  get: () => request<Guide>("/stakeholder/guide-profile"),
  update: (payload: ResourcePayload<Guide>) => request<Guide>("/stakeholder/guide-profile", { method: "PUT", body: JSON.stringify(payload) }),
};
export const accommodationsApi = resource<Accommodation, number>("/admin/accommodations");
export const reassignAccommodationOwner = (id: number, ownerUserId: number | null) => request<Accommodation>(`/admin/accommodations/${id}/owner`, { method: "PATCH", body: JSON.stringify({ ownerUserId }) });
export const partnerAccommodationsApi = resource<Accommodation, number>("/stakeholder/accommodations");
export const partnerAccommodationBookingsApi = {
  list: () => request<Booking[]>("/stakeholder/accommodation-bookings"),
};
export const accommodationSearchApi = {
  get: (id: number, params: { checkIn?: string; checkOut?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.checkIn) query.set("checkIn", params.checkIn);
    if (params.checkOut) query.set("checkOut", params.checkOut);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Accommodation>(`/accommodations/${id}${suffix}`);
  },
  list: (params: { destinationId?: number; destination?: string; checkIn?: string; checkOut?: string; rooms?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.destinationId) query.set("destinationId", String(params.destinationId));
    if (params.destination) query.set("destination", params.destination);
    if (params.checkIn) query.set("checkIn", params.checkIn);
    if (params.checkOut) query.set("checkOut", params.checkOut);
    if (params.rooms) query.set("rooms", String(params.rooms));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Accommodation[]>(`/accommodations${suffix}`);
  },
};
export const publicVehiclesApi = {
  list: (params: { checkIn?: string; checkOut?: string; guests?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.checkIn) query.set("checkIn", params.checkIn);
    if (params.checkOut) query.set("checkOut", params.checkOut);
    if (params.guests) query.set("guests", String(params.guests));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Vehicle[]>(`/vehicles${suffix}`);
  },
  get: (id: number) => request<Vehicle>(`/vehicles/${id}`),
};
export const vehiclesApi = resource<Vehicle, number>("/admin/vehicles");
export const partnerVehiclesApi = resource<Vehicle, number>("/stakeholder/vehicles");
export const reassignVehicleOwner = (id: number, ownerUserId: number) => request<Vehicle>(`/admin/vehicles/${id}/owner`, { method: "PATCH", body: JSON.stringify({ ownerUserId }) });
export const transportProviderBookingsApi = {
  list: () => request<Booking[]>("/stakeholder/vehicle-bookings"),
};

export const aiChatApi = {
  welcome: () => request<{ reply: string }>("/ai-chat/welcome"),
  suggestions: () => request<string[]>("/ai-chat/suggestions"),
  chat: (message: string) => request<{ reply: string }>("/ai-chat", { method: "POST", body: JSON.stringify({ message }) }),
};
