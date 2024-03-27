import { IsUUID, IsJSON, IsString } from 'class-validator';

export class trackingPolicyDTO {
  @IsString()
  organization_uid: string;

  @IsString()
  policy_name: string;

  @IsJSON()
  policy_content: any;

  @IsUUID()
  team_uuid: string;
}
