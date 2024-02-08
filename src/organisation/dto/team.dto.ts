import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  organizationId: string; // This assumes each team must be associated with an organization.
}

/// New format team dto after test follow this.

// import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// export class CreateTeamDto {
//   @IsNotEmpty()
//   @IsString()
//   name: string;

//   @IsUUID()
//   organizationId: string; // This assumes each team must be associated with an organization.

//   @IsOptional() // Use this if the field is not required
//   @IsString()
//   manager?: string; // Include if you need to specify the manager at creation

//   @IsNotEmpty()
//   @IsString()
//   status: string; // Assuming status is required at creation
// }
