import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
// 👇 Mockeamos todo el módulo bcrypt antes de importar AuthService
jest.mock('bcrypt');
// Importamos bcrypt *después* del mock para que Jest use nuestra versión mockeada
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Limpiamos todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashed_password_123';
      const newUser = {
        id: '1',
        email: registerDto.email,
        password: hashedPassword,
        spiritualRole: 'Aprendiz Levita',
        currentModule: 1,
      };

      // 👇 Configuramos el mock de bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockReturnValue(newUser);
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);
      (jwtService.sign as jest.Mock).mockReturnValue('mocked.jwt.token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(newUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: newUser.email,
        sub: newUser.id,
      });
      expect(result).toEqual({ accessToken: 'mocked.jwt.token' });
    });

    it('should throw an error if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'El correo electrónico ya está registrado.'
      );
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashed_password_123',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      // 👇 Configuramos el mock de bcrypt.compare
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('mocked.jwt.token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
      });
      expect(result).toEqual({ accessToken: 'mocked.jwt.token' });
    });

    it('should throw an error if user is not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas.'
      );
    });

    it('should throw an error if password is invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };
      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashed_password_123',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      // 👇 Configuramos el mock de bcrypt.compare para que devuelva false
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas.'
      );
    });
  });

  // Agregar estos tests a tu auth.service.spec.ts existente

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashed_password_123';
      const user = {
        id: 1,
        email,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toEqual({
        id: 1,
        email,
        isActive: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(result).not.toHaveProperty('password'); // Asegurar que no devuelve la contraseña
    });

    it('should return null if user is not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const user = {
        id: 1,
        email,
        password: 'hashed_password_123',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(result).toBeNull();
    });
  });

  describe('loginAfterValidation', () => {
    it('should return access token for valid user', async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
      };
      const expectedToken = 'mocked.jwt.token';

      (jwtService.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await service.loginAfterValidation(user);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
      });
      expect(result).toEqual({ accessToken: expectedToken });
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 1;
      const user = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);

      // Act
      const result = await service.findUserById(userId);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      // Arrange
      const userId = 999;
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.findUserById(userId);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeNull();
    });
  });

  // Tests para casos de error de base de datos
  describe('error handling', () => {
    it('should handle database errors in register', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const dbError = new Error('Database connection failed');

      (userRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors in login', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const dbError = new Error('Database connection failed');

      (userRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle bcrypt errors in register', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const bcryptError = new Error('Bcrypt hashing failed');

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(bcryptError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        'Bcrypt hashing failed'
      );
    });

    it('should handle bcrypt errors in login', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 1,
        email: loginDto.email,
        password: 'hashed_password',
      };
      const bcryptError = new Error('Bcrypt comparison failed');

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        'Bcrypt comparison failed'
      );
    });
  });

  describe('validateGoogleUser', () => {
    it('should return existing user without password when user exists', async () => {
      // Arrange
      const googleProfile = {
        email: 'existing@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        accessToken: 'google-access-token',
      };

      const existingUser = {
        id: 1,
        email: 'existing@gmail.com',
        password: 'hashed_password_123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
        id: 1,
        email: 'existing@gmail.com',
        isActive: true,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      const result = await service.validateGoogleUser(googleProfile);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: googleProfile.email },
      });
      expect(result).toEqual(expectedUser);
      expect(result).not.toHaveProperty('password');
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should create and return new user when user does not exist', async () => {
      // Arrange
      const googleProfile = {
        email: 'newuser@gmail.com',
        firstName: 'Jane',
        lastName: 'Smith',
        picture: 'https://lh3.googleusercontent.com/photo2.jpg',
        accessToken: 'google-access-token-2',
      };

      const newUser = {
        id: 2,
        email: 'newuser@gmail.com',
        password: 'oauth_user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
        id: 2,
        email: 'newuser@gmail.com',
        isActive: true,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockReturnValue(newUser);
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);

      // Act
      const result = await service.validateGoogleUser(googleProfile);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: googleProfile.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: googleProfile.email,
        password: 'oauth_user',
      });
      expect(userRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(expectedUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should handle database errors when finding user', async () => {
      // Arrange
      const googleProfile = {
        email: 'error@gmail.com',
        firstName: 'Error',
        lastName: 'User',
        accessToken: 'token',
      };

      const dbError = new Error('Database connection failed');
      (userRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.validateGoogleUser(googleProfile)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors when creating new user', async () => {
      // Arrange
      const googleProfile = {
        email: 'newuser@gmail.com',
        firstName: 'New',
        lastName: 'User',
        accessToken: 'token',
      };

      const dbError = new Error('Failed to create user');
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockReturnValue({});
      (userRepository.save as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.validateGoogleUser(googleProfile)).rejects.toThrow(
        'Failed to create user'
      );
    });

    it('should handle googleProfile without optional fields', async () => {
      // Arrange
      const googleProfile = {
        email: 'minimal@gmail.com',
        firstName: 'Min',
        lastName: 'User',
        // picture is optional
        accessToken: 'token',
      };

      const newUser = {
        id: 3,
        email: 'minimal@gmail.com',
        password: 'oauth_user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockReturnValue(newUser);
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);

      // Act
      const result = await service.validateGoogleUser(googleProfile);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        email: googleProfile.email,
        password: 'oauth_user',
      });
      expect(result).not.toHaveProperty('password');
    });
  });
});
