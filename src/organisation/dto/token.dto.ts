import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class tokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}