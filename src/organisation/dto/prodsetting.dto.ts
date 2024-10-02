import { IsUUID, IsString, IsJSON, IsArray, IsNotEmpty } from 'class-validator';

export class CreateProductivitySettingDTO {
  @IsUUID()
  organization_uid: string;

  @IsString()
  name: string; // Name of the productivity setting

  @IsString()
  productivity_status: string; // Status of productivity (e.g., "productive", "unproductive")

  @IsJSON()
  type: JSON; // A JSON object containing details about the productivity type

  @IsArray()
  @IsUUID(undefined, { each: true }) // Array of policy UUIDs
  policyList: string[]; // List of Policy UUIDs
}
