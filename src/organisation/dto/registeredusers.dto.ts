import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
export class registeredUsersDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  organization_name: string;

  @IsUUID()
  @IsOptional()
  team_id: string;

  @IsInt()
  type: number;

  @IsBoolean()
  account_status: boolean;


}
 