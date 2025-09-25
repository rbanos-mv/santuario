import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  // Local strategy login (alternativo al endpoint POST /login)
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login/local')
  @HttpCode(HttpStatus.OK)
  async loginLocal(@Request() req) {
    // El LocalAuthGuard ya validó las credenciales y puso el usuario en req.user
    return this.authService.loginAfterValidation(req.user);
  }

  // Google OAuth login
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  async googleAuth(@Request() req) {
    // Este endpoint redirigirá a Google
  }

  // Google OAuth callback
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    // El GoogleAuthGuard ya validó con Google y puso el usuario en req.user
    const result = await this.authService.loginAfterValidation(req.user);

    // Puedes redirigir al frontend con el token o manejarlo como prefieras
    // Opción 1: Redirigir con token en query params (para desarrollo)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return res.redirect(`${frontendUrl}?token=${result.accessToken}`);

    // Opción 2: Retornar JSON (descomenta si prefieres esta opción)
    // return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
