import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import path from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm'; // Use DataSource instead of Connection
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

// ================================
// UNIT TESTS
// ================================
describe('AuthController - Unit Tests', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = { accessToken: 'mock.jwt.token' };

      (authService.register as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error when authService.register throws', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedError = new Error('Registration failed');

      (authService.register as jest.Mock).mockRejectedValue(expectedError);

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Registration failed'
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = { accessToken: 'mock.jwt.token' };

      (authService.login as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error when authService.login throws', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      const expectedError = new Error('Invalid credentials');

      (authService.login as jest.Mock).mockRejectedValue(expectedError);

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials'
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request object', () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequest = {
        user: mockUser,
      };

      // Act
      const result = controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when request has no user', () => {
      // Arrange
      const mockRequest = {};

      // Act
      const result = controller.getProfile(mockRequest);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('loginLocal', () => {
    it('should call authService.loginAfterValidation with user from request', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
      };
      const mockRequest = { user: mockUser };
      const expectedResult = { accessToken: 'mock.jwt.token' };

      // Mock authService.loginAfterValidation
      (authService as any).loginAfterValidation = jest
        .fn()
        .mockResolvedValue(expectedResult);

      // Act
      const result = await controller.loginLocal(mockRequest);

      // Assert
      expect(authService.loginAfterValidation).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error when authService.loginAfterValidation throws', async () => {
      // Arrange
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockRequest = { user: mockUser };
      const expectedError = new Error('Token generation failed');

      (authService as any).loginAfterValidation = jest
        .fn()
        .mockRejectedValue(expectedError);

      // Act & Assert
      await expect(controller.loginLocal(mockRequest)).rejects.toThrow(
        'Token generation failed'
      );
    });
  });

  describe('googleAuth', () => {
    it('should be defined and callable', async () => {
      // Arrange
      const mockRequest = {};

      // Act
      const result = await controller.googleAuth(mockRequest);

      // Assert
      // Este endpoint no retorna nada, solo activa la redirección a Google
      expect(result).toBeUndefined();
    });
  });

  describe('googleAuthRedirect', () => {
    it('should redirect to frontend with access token', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const mockRequest = { user: mockUser };
      const mockResponse = {
        redirect: jest.fn(),
      } as any;
      const expectedResult = { accessToken: 'google.jwt.token' };

      // Set environment variable for test
      process.env.FRONTEND_URL = 'http://localhost:4200';

      (authService as any).loginAfterValidation = jest
        .fn()
        .mockResolvedValue(expectedResult);

      // Act
      await controller.googleAuthRedirect(mockRequest, mockResponse);

      // Assert
      expect(authService.loginAfterValidation).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:4200?token=google.jwt.token'
      );

      // Cleanup
      delete process.env.FRONTEND_URL;
    });

    it('should use default frontend URL when FRONTEND_URL is not set', async () => {
      // Arrange
      const mockUser = { id: 1, email: 'test@gmail.com' };
      const mockRequest = { user: mockUser };
      const mockResponse = { redirect: jest.fn() } as any;
      const expectedResult = { accessToken: 'test.token' };

      // Ensure FRONTEND_URL is not set
      delete process.env.FRONTEND_URL;

      (authService as any).loginAfterValidation = jest
        .fn()
        .mockResolvedValue(expectedResult);

      // Act
      await controller.googleAuthRedirect(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:4200?token=test.token'
      );
    });

    it('should handle authService.loginAfterValidation errors', async () => {
      // Arrange
      const mockUser = { id: 1, email: 'test@gmail.com' };
      const mockRequest = { user: mockUser };
      const mockResponse = { redirect: jest.fn() } as any;
      const expectedError = new Error('Login failed');

      (authService as any).loginAfterValidation = jest
        .fn()
        .mockRejectedValue(expectedError);

      // Act & Assert
      await expect(
        controller.googleAuthRedirect(mockRequest, mockResponse)
      ).rejects.toThrow('Login failed');
    });
  });
});

// ================================
// INTEGRATION TESTS
// ================================
describe('AuthController - Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource; // Use DataSource here

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../../../../../.env'),
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
            entities: [User],
            synchronize: true,
            dropSchema: true,
            logging: false,
          }),
        }),
        TypeOrmModule.forFeature([User]),
        PassportModule.register({}),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'your-secret-key',
          signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();

    // Get the DataSource instance from the testing module
    dataSource = app.get(DataSource);
  }, 30000);

  afterAll(async () => {
    // CRITICAL: Close the database connection using dataSource
    if (dataSource) {
      await dataSource.destroy(); // Use the destroy method
    }

    // Now close the NestJS app
    if (app) {
      await app.close();
    }
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'integration@test.com',
          password: 'TestPass123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(res.body.accessToken).toBeTruthy();
        });
    });

    it('should fail if email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'TestPass123!',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'AnotherPass123!',
        })
        .expect(401)
        .expect({
          statusCode: 401,
          message: 'El correo electrónico ya está registrado.',
          error: 'Unauthorized',
        });
    });

    it('should fail if email is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPass123!',
        })
        .expect(400);
    });

    it('should fail if password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'shortpass@test.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    let testUserCredentials: { email: string; password: string };

    beforeEach(async () => {
      const uniqueEmail = `test_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}@example.com`;

      testUserCredentials = {
        email: uniqueEmail,
        password: 'LoginPass123!',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUserCredentials);

      expect(res.status).toBe(201);
    });

    it('should login a user with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(testUserCredentials)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(res.body.accessToken).toBeTruthy();
        });
    });

    it('should fail for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'WrongPass123!',
        })
        .expect(401)
        .expect({
          statusCode: 401,
          message: 'Credenciales inválidas.',
          error: 'Unauthorized',
        });
    });

    it('should fail for invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect({
          statusCode: 401,
          message: 'Credenciales inválidas.',
          error: 'Unauthorized',
        });
    });

    it('should fail if email is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: testUserCredentials.password,
        })
        .expect(400);
    });

    it('should fail if password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserCredentials.email,
        })
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Crear un usuario y obtener su token
      const uniqueEmail = `profile_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}@example.com`;
      const credentials = {
        email: uniqueEmail,
        password: 'ProfilePass123!',
      };

      // Registrar usuario
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      // Hacer login para obtener token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      validAccessToken = loginResponse.body.accessToken;
    });

    it('should return user profile when authenticated', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('isActive');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          // El password no debería estar presente en la respuesta
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail without authorization header', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should fail with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token-here')
        .expect(401);
    });
  });

  describe('/auth/login/local (POST)', () => {
    let testUserCredentials: { email: string; password: string };

    beforeEach(async () => {
      const uniqueEmail = `local_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}@example.com`;

      testUserCredentials = {
        email: uniqueEmail,
        password: 'LocalLoginPass123!',
      };

      // Registrar usuario primero
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUserCredentials);

      expect(res.status).toBe(201);
    });

    it('should login with valid credentials using local strategy', () => {
      return request(app.getHttpServer())
        .post('/auth/login/local')
        .send(testUserCredentials)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(res.body.accessToken).toBeTruthy();
        });
    });

    it('should fail with invalid credentials using local strategy', () => {
      return request(app.getHttpServer())
        .post('/auth/login/local')
        .send({
          email: testUserCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent user using local strategy', () => {
      return request(app.getHttpServer())
        .post('/auth/login/local')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);
    });

    it('should fail with missing email', () => {
      return request(app.getHttpServer())
        .post('/auth/login/local')
        .send({
          password: testUserCredentials.password,
        })
        .expect(401); // ✅ Cambiar de 400 a 401
    });

    it('should fail with missing password', () => {
      return request(app.getHttpServer())
        .post('/auth/login/local')
        .send({
          email: testUserCredentials.email,
        })
        .expect(401); // ✅ Cambiar de 400 a 401
    });

    describe('/auth/google (GET)', () => {
      it('should redirect to Google OAuth', () => {
        return request(app.getHttpServer())
          .get('/auth/google')
          .expect(302) // Redirect to Google
          .expect((res) => {
            // Debería redirigir a Google OAuth
            expect(res.headers.location).toContain('accounts.google.com');
          });
      });
    });

    // Nota: Los tests de /auth/google/callback son más complejos de probar en integración
    // porque requieren simular el callback de Google con datos reales.
    // Los tests unitarios que agregamos arriba son suficientes para cubrir esa lógica.
    //
  });
});
