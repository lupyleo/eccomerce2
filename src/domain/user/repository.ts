import type { UserEntity, AddressEntity } from './entities';

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findMany(page: number, limit: number, search?: string): Promise<{ data: UserEntity[]; total: number }>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
}

export interface AddressRepository {
  findByUserId(userId: string): Promise<AddressEntity[]>;
  findById(id: string): Promise<AddressEntity | null>;
  create(data: Omit<AddressEntity, 'id'>): Promise<AddressEntity>;
  update(id: string, data: Partial<AddressEntity>): Promise<AddressEntity>;
  delete(id: string): Promise<void>;
}
