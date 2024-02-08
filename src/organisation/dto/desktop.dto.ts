import { IsNotEmpty, IsString, IsUrl, IsOptional } from 'class-validator';

export class CreateDesktopApplicationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUrl()
  @IsOptional() // Make logo optional since not all applications might have a URL to a logo at creation
  logo?: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  version?: string; // Optional field for specifying the application version
}
