import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTeamMembersDto {
  @IsUUID()
  team_uuid?: string;

  @IsString()
  @IsNotEmpty()
  team_name: string;

  @IsUUID()
  @IsNotEmpty()
  user_uuid: string;

  @IsUUID()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  user_name: string;

  @IsUUID()
  @IsNotEmpty()
  device_id: string;

  @IsNotEmpty()
  @IsString()
  user_role: string;

  @IsUUID()
  @IsNotEmpty()
  policy_uuid: string;


}
