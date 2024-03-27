import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUniqueAppsDto {
  @IsString()
  app_name: string;

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsOptional()
  category_uuid: string;

  @IsString()
  category_name: string;

  @IsOptional()
  parent_category: string;
}
