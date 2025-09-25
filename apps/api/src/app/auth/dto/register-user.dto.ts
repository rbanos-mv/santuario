import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  // Opcional: Puedes pedir el nombre aquí si lo deseas
  // @IsString()
  // @IsNotEmpty()
  // name: string;
}
