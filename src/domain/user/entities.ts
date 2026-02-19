import type { UserRole } from '@prisma/client';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  role: UserRole;
  phone: string | null;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressEntity {
  id: string;
  userId: string;
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
}
