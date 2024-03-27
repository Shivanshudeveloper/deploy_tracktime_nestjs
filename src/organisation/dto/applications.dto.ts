import { IsUUID, IsString } from 'class-validator';

export class applicationDTO {
  @IsString()
  tool_name: string;

  @IsString()
  productivity_status: string;

  @IsUUID()
  setting_uuid: string;

  @IsUUID()
  policy_uuid: string;
}
