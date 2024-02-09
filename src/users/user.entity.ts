import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { IsNotEmpty, IsEmail } from 'class-validator';
import { Organization } from '../organisation/organisation.entity';
import { Team } from 'src/organisation/team.entity';
import { UserActivity } from './user_activity.entity';


export enum TrackTimeStatus {
  Pause = 'Pause',
  Resume = 'Resume',
  StopForever = 'StopForever',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  userUUID: string;

  @Column()
  organizationUUID: string;

  @Column()
  @IsNotEmpty()
  userName: string;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column()
  @IsNotEmpty()
  password: string;

  @Column()
  @IsNotEmpty()
  userType: 'Tracked' | 'Organization'; // Adjust as per your schema

  @Column('json', { nullable: true })
  config: {
    trackTimeStatus: TrackTimeStatus;
  };
  
  @Column({ default: false })
  isAdmin: boolean;

  @ManyToOne(() => Organization, organization => organization.users)
  organization: Organization;

  @ManyToOne(() => Team, team => team.users)
  team: Team;

  // Include this if you want to store the team ID directly
  @Column({ nullable: true })
  teamId: string;

  @OneToMany(() => UserActivity, userActivity => userActivity.user_uid)
  userActivities: UserActivity[];
}
