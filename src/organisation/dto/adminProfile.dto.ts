// Create a new file: dto/adminProfile.dto.ts

import { IsOptional, IsString, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonalInfoDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class TeamDto {
  @IsString()
  name: string;

  @IsOptional()
  members?: number;
}

export class UpdateCompanyInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  teamSize?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  applicationName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamDto)
  teams?: TeamDto[];
}

export class UpdateAdminProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePersonalInfoDto)
  personal?: UpdatePersonalInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyInfoDto)
  company?: UpdateCompanyInfoDto;
}

export class AdminProfileResponseDto {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatar: string | null;
    joinedDate: string;
    lastUpdated: string;
    password: string;
  };

  company: {
    name: string;
    type: string;
    teamSize: string;
    country: string;
    logo: string;
    teams: TeamDto[];
    timeZone: string;
    applicationName: string;
  };

  subscription: {
    plan: string;
    planPrice: string;
    maxUsers: string;
    expiryDate: string;
    features: string[];
    status: string;
    paymentMethod: {
      type: string;
      lastFour: string;
      expiry: string;
    };
    billingEmail: string;
  };
}