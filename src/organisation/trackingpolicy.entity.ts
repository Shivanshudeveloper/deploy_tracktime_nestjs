import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organisation.entity';
import { TrackingWeekdays } from './tracking_weekdays.entity';
import { TrackingHolidays } from './tracking_holidays.entity';
import { ScreenshotSettings } from './screenshot_settings.entity';
import { PolicyTeams } from './policy_team.entity';
import { PolicyUsers } from './policy_user.entity';

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  policyId: string;

  @Column()
  policyName: string;

  @Column('int')
  screenshotInterval: number;

  @OneToMany(() => ScreenshotSettings, (screenshotSett) => screenshotSett.policy, { cascade: true, onDelete: 'CASCADE' })
  ScreenshotSettings: ScreenshotSettings;

  @OneToMany(() => TrackingWeekdays, (weekdays) => weekdays.policy, { cascade: true, onDelete: 'CASCADE' })
  weekdays: TrackingWeekdays[];

  @OneToMany(() => TrackingHolidays, (holidays) => holidays.policy, { cascade: true, onDelete: 'CASCADE' })
  holidays: TrackingHolidays[];

  @ManyToOne(() => Organization, (organization) => organization.policy, { cascade: true, eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // One-to-Many with PolicyTeams (each policy can have multiple associated teams)
  @OneToMany(() => PolicyTeams, (policyTeams) => policyTeams.policy, { cascade: true, onDelete: 'CASCADE' })
  assignedTeams: PolicyTeams[];

  // One-to-Many with PolicyUsers (each policy can have multiple associated users)
  @OneToMany(() => PolicyUsers, (policyUsers) => policyUsers.policy, { cascade: true, onDelete: 'CASCADE' })
  assignedUsers: PolicyUsers[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
