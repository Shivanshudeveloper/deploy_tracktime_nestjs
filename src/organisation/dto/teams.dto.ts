import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTeamsDto {
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @IsUUID()
  @IsNotEmpty()
  policy_uuid: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  status: number;
}
