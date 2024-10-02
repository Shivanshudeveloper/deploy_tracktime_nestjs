import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginAdminOrganization {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;



}
