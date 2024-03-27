import { IsUUID, IsString, IsJSON } from 'class-validator';

export class productivitySettingDTO {
  @IsUUID()
  organization_uid: string;

  @IsString()
  name: string;

  @IsString()
  productivity_status: string;

  @IsJSON()
  type: JSON;

  @IsUUID()
  policy_uuid: string;
}
