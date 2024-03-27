import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SubscriptionDto {
  @IsUUID()
  user_uid: string;

  @IsUUID()
  organization_id: string;

  @IsString()
  invoice_status: string;

  @IsOptional()
  invoice_link: string;

  @IsOptional()
  invoice_date: string;
}
