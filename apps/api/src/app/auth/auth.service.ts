import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // Es buena práctica no devolver el hash de la contraseña
      const { password, ...result } = user;
      return result as User;
    }

    return null;
  }

  async register(
    registerDto: RegisterUserDto
  ): Promise<{ accessToken: string }> {
    const { email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new UnauthorizedException(
        'El correo electrónico ya está registrado.'
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);

    // Return token
    const payload = { sub: newUser.id, email: newUser.email };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async login(loginDto: LoginUserDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Return token
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }

  // Opcional: Método para generar token después de autenticación con Passport
  async loginAfterValidation(user: any): Promise<{ accessToken: string }> {
    const payload = { email: user.email, sub: user.id };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async findUserById(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async validateGoogleUser(googleProfile: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    accessToken: string;
  }): Promise<any> {
    const { email, firstName, lastName, picture } = googleProfile;

    // Buscar usuario existente
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Crear nuevo usuario si no existe
      user = this.userRepository.create({
        email,
        // Como no tenemos password para OAuth, podemos generar uno aleatorio
        // o modificar la entidad para que password sea opcional para OAuth users
        password: 'oauth_user', // Temporal - deberías manejar esto mejor
        // Agregar campos adicionales si los tienes en tu entidad User
        // firstName,
        // lastName,
        // picture,
      });

      await this.userRepository.save(user);
    }

    // Retornar usuario sin contraseña
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
