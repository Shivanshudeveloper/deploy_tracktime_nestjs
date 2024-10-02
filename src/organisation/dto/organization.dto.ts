import { IsString, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrganizationDTO {
  @IsString()
  @IsNotEmpty()
  name: string; // Organization name

  @IsString()
  @IsNotEmpty()
  country: string; // Organization's country

  @IsString()
  @IsNotEmpty()
  timeZone: string; // Organization's time zone

  @IsString()
  @IsOptional()
  logo: string; // Organization's logo URL

  @IsString()
  @IsNotEmpty()
  teamSize: string; // Team size (as string, change to int if needed)

  @IsString()
  @IsNotEmpty()
  type: string; // Organization type

}
