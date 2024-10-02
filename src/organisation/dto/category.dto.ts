import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  parent_category: string;

  @IsOptional()
  category_name: string;

}
