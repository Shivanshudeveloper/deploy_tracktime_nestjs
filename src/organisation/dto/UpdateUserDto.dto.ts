import { IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  user_uid: string;

  @IsOptional()
  organization_id: string;

  @IsOptional()
  first_name: string;

  @IsOptional()
  last_name: string;

  @IsOptional()
  organization_name: string;

  @IsOptional()
  team_id: string;

  @IsOptional()
  type: number;

  @IsOptional()
  account_status: boolean;
}
