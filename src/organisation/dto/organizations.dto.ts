import { IsOptional, IsUUID } from 'class-validator';

export class CreateOrganizationDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  organization_name: string;

  @IsOptional()
  organization_logo: string;

  @IsOptional()
  organization_country: string;

  @IsOptional()
  organization_size: number;

  @IsOptional()
  organization_type: string;
}
