import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, companySlug?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: (email || '').toLowerCase().trim() },
      include: {
        userCompanies: {
          include: {
            company: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is inactive');

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid email or password');

    let activeCompany = user.userCompanies.find((uc) => uc.isDefault);
    if (companySlug) {
      const found = user.userCompanies.find((uc) => uc.company.slug === companySlug);
      if (!found) throw new UnauthorizedException('No access to that company');
      activeCompany = found;
    }
    if (!activeCompany) throw new UnauthorizedException('No company assigned');

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      activeCompanyId: activeCompany.companyId,
      role: activeCompany.role,
      permissions: activeCompany.permissions,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          activeCompany: {
            id: activeCompany.companyId,
            slug: activeCompany.company.slug,
            name: activeCompany.company.name,
            role: activeCompany.role,
          },
          companies: user.userCompanies.map((uc) => ({
            id: uc.companyId,
            slug: uc.company.slug,
            name: uc.company.name,
            role: uc.role,
            isDefault: uc.isDefault,
          })),
        },
      },
    };
  }

  async switchCompany(userId: string, companySlug: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          include: {
            company: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const targetCompany = user.userCompanies.find((uc) => uc.company.slug === companySlug);
    if (!targetCompany) throw new UnauthorizedException('No access to that company');

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      activeCompanyId: targetCompany.companyId,
      role: targetCompany.role,
      permissions: targetCompany.permissions,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          activeCompany: {
            id: targetCompany.companyId,
            slug: targetCompany.company.slug,
            name: targetCompany.company.name,
            role: targetCompany.role,
          },
          companies: user.userCompanies.map((uc) => ({
            id: uc.companyId,
            slug: uc.company.slug,
            name: uc.company.name,
            role: uc.role,
            isDefault: uc.isDefault,
          })),
        },
      },
    };
  }

  async refresh(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userCompanies: { where: { isDefault: true }, include: { company: true } },
          },
        },
      },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const uc = stored.user.userCompanies[0];
    const payload = {
      id: stored.user.id,
      email: stored.user.email,
      fullName: stored.user.fullName,
      activeCompanyId: uc?.companyId,
      role: uc?.role,
      permissions: uc?.permissions,
    };
    const accessToken = this.jwt.sign(payload);
    const newRefreshToken = await this.createRefreshToken(stored.userId);
    return { data: { accessToken, refreshToken: newRefreshToken } };
  }

  async logout(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { data: { message: 'Logged out successfully' } };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
