import { IsInt, IsString } from 'class-validator';

export class updateOrgDto {
  @IsString()
  logo  : string;

  @IsString()
  country: string;

  @IsInt()
  teamSize: string;

  @IsString()
  type: string;
}
