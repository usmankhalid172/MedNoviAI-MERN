export interface Specialty {
  id: string;
  name: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  specialtyId?: string;
  experience: string;
  rating: number;
  reviewsCount?: number;
  location?: string;
  availableSlot?: string;
  avatar: string;
  consultationFee?: string;
}