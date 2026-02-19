import type { PrismaClient, Prisma } from '@prisma/client';
import type { UserRepository } from '@/domain/user/repository';
import type { UserEntity } from '@/domain/user/entities';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findMany(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: UserEntity[]; total: number }> {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users.map((u) => this.toEntity(u)), total };
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
    if (data.role !== undefined) updateData.role = data.role;

    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    return this.toEntity(user);
  }

  private toEntity(user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string | null;
    role: string;
    phone: string | null;
    profileImage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as UserEntity['role'],
      phone: user.phone,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
