import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            findUserById: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user without password when validation succeeds', async () => {
      // Arrange
      const payload = {
        email: 'test@example.com',
        sub: 1,
        iat: 1234567890,
        exp: 1234571490,
      };

      const userFromDb = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password_123', // Este campo debe ser excluido
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        createdAt: userFromDb.createdAt,
        updatedAt: userFromDb.updatedAt,
      };

      (authService.findUserById as jest.Mock).mockResolvedValue(userFromDb);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(authService.findUserById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(expectedUser);
      expect(result).not.toHaveProperty('password'); // Verificar que no tiene password
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload = {
        email: 'nonexistent@example.com',
        sub: 999,
        iat: 1234567890,
        exp: 1234571490,
      };

      (authService.findUserById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.findUserById).toHaveBeenCalledWith(payload.sub);
    });

    it('should handle invalid payload structure', async () => {
      // Arrange
      const invalidPayload = {
        email: 'test@example.com',
        // sub is missing
        iat: 1234567890,
        exp: 1234571490,
      };

      (authService.findUserById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle auth service errors gracefully', async () => {
      // Arrange
      const payload = {
        email: 'test@example.com',
        sub: 1,
        iat: 1234567890,
        exp: 1234571490,
      };

      const dbError = new Error('Database connection failed');
      (authService.findUserById as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
