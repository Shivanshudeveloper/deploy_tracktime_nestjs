import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateDevicesDto {
  @IsUUID()
  @IsNotEmpty()
  organization_uid: string;

  @IsString()
  @IsNotEmpty()
  user_name: string;

  @IsNotEmpty()
  @IsUUID()
  user_uid: string;
}
