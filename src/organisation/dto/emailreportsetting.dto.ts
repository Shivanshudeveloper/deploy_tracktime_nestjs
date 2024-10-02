import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class EmailReportSettingDto {
  @IsUUID()
  user_uid: string;

  @IsUUID()
  organization_id: string;

  @IsBoolean()
  monthly: boolean;

  @IsBoolean()
  weekly: boolean;

  @IsBoolean()
  daily: boolean;

  @IsString()
  type: string;


}
