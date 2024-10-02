import { User } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organisation.entity';
import { Team } from './team.entity';
import { TrackingWeekdays } from './tracking_weekdays.entity';
import { weekdays } from 'moment';
import { TrackingHolidays } from './tracking_holidays.entity';

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  policyId: string;

  @Column()
  policyName: string; // Name of the policy

  @Column('int')
  screenshotInterval: number; // Time interval for screenshots (in minutes)

  @ManyToOne(()=> TrackingWeekdays ,(w)=> w.trackedW_id)
  weekdays:TrackingWeekdays[];

  @ManyToOne(()=> TrackingHolidays ,(w)=> w.trackedH_id)
  holidays:TrackingHolidays[];

  // @Column({ default: false })
  // isDefault: boolean; // Flag to indicate if this is a default policy 

  @ManyToMany(() => Team, (team) => team.policies)
  @JoinTable({
    name: 'policy_teams', // Custom join table
    joinColumn: { name: 'policy_id', referencedColumnName: 'policyId' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' }
  })
  assignedTeams: Team[]; // Policies can be assigned to multiple teams

  @ManyToMany(() => User, (user) => user.policies)
  @JoinTable({
    name: 'policy_users', // Custom join table
    joinColumn: { name: 'policy_id', referencedColumnName: 'policyId' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'userUUID' }
  })
  assignedUsers: User[]; // Policies can be assigned to multiple users

  @ManyToOne(() => Organization, (organization) => organization.policy)
  organization: Organization; // The organization that owns the policy

  // @OneToMany(()=> TrackingWeekdays, (weekdays)=>weekdays.policy )
  // @JoinTable({
  //   name: 'policy_weekdays', // Custom join table
  //   joinColumn: { name: 'policy_id', referencedColumnName: 'policyId' },
  //   inverseJoinColumn: { name: 'weekday_id', referencedColumnName: 'trackedW_id' }
  // })
  // weekdays : TrackingWeekdays[];


  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}


// for default data capturing use createdAt key so you don't have to worry about anmything.