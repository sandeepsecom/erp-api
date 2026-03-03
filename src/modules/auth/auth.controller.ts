import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class LoginDto {
  email: string;
  password: string;
  companySlug?: string;
}
class RefreshDto {
  refreshToken: string;
}
class LogoutDto {
  refreshToken: string;
}
class SwitchCompanyDto {
  companySlug: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.companySlug);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return { data: user };
  }

  @Post('switch-company')
  @UseGuards(JwtAuthGuard)
  switchCompany(@CurrentUser() user: any, @Body() dto: SwitchCompanyDto) {
    return this.authService.switchCompany(user.id, dto.companySlug);
  }
}