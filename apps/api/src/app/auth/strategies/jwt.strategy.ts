import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // ✅ Usar findUserById en lugar de validateUser
    // validateUser necesita email Y password, pero el JWT payload solo tiene el ID
    const user = await this.authService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // ✅ Excluir la contraseña del objeto que se retorna
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
