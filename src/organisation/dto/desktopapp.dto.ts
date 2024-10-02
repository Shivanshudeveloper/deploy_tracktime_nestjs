import { IsUUID, IsJSON, IsNotEmpty, IsString } from 'class-validator';

export class DesktopAppDTO {
  @IsUUID()
  team_uid: string;

  @IsUUID()
  user_uuid: string;

  @IsUUID()
  organization_id: string;

  @IsJSON()
  policy_content: any;

  @IsUUID()
  policy_uuid: string;

}
