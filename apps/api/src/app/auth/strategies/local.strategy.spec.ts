import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const expectedUser = {
        id: 1,
        email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authService.validateUser as jest.Mock).mockResolvedValue(expectedUser);

      // Act
      const result = await strategy.validate(email, password);

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(expectedUser);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(email, password)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(email, password)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });

    it('should handle auth service errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const dbError = new Error('Database connection failed');

      (authService.validateUser as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(strategy.validate(email, password)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should throw UnauthorizedException with correct message', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      try {
        await strategy.validate(email, password);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Credenciales inválidas.');
      }
    });
  });
});
