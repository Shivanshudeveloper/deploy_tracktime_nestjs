import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsNotEmpty, IsEmail, IsObject, ValidateNested, IsEnum, isEnum } from 'class-validator';
import { Organization } from '../organisation/organisation.entity';
import { Team } from 'src/organisation/team.entity';
import { UserActivity } from './user_activity.entity';
import { Devices } from 'src/organisation/devices.entity';
import { Type } from 'class-transformer';
import { Policy } from 'src/organisation/trackingpolicy.entity';


export enum TrackTimeStatus {
  Pause = 'Pause',
  Resume = 'Resume',
  StopForever = 'StopForever',
}
class userConfig{
  @IsEnum(TrackTimeStatus)
  trackTimeStatus: TrackTimeStatus
}
 
@Entity("users") 
export class User {
  @PrimaryGeneratedColumn('uuid')
  userUUID: string;

  @Column()
  organizationId: string;

  @Column()
  @IsNotEmpty()
  userName: string;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => userConfig)
  @Column('json', { nullable: true })
  config: userConfig;
 
  @ManyToOne(() => Organization, organization => organization.users)
  organization: Organization;

  @ManyToOne(() => Team, team => team.users)
  team: Team;
 
  @Column({ nullable: true })
  teamId: string;

  @OneToMany(() => Devices, DevicesCaptured => DevicesCaptured.user_uid )
  userActivities: UserActivity[];

  @ManyToMany(() => Policy, (policy) => policy.policyId)
  policies: Policy[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  
} 
