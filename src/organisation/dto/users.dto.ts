import { IsUUID, IsString, IsEmail, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { TrackTimeStatus } from 'src/users/user.entity';

export class CreateUserDTO {
  @IsUUID()
  organizationId: string; // Organization ID

  @IsUUID()
  teamId: string; // Team ID

  @IsString()
  userName: string; // User's full name

  @IsEmail()
  email: string; // User's email

  @IsEnum(TrackTimeStatus)
  trackTimeStatus: TrackTimeStatus; // Tracking status of the user (e.g., Pause, Resume)

  @IsObject()
  config: any; // JSON object for user configuration (e.g., trackTimeStatus and other settings)
}
