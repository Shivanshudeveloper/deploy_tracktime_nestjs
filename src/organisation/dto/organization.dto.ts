import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  teamSize: string;
}
