import {
  Entity,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('teammembers')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  member_uuid: string;

  @Column({ type: 'uuid' })
  team_uuid: string;

  @Column()
  team_name: string;

  @Column({ type: 'uuid' })
  user_uuid: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column()
  user_name: string;

  @Column({ type: 'uuid' })
  device_id: string;

  @Column()
  user_role: string;

  @Column({ type: 'uuid' })
  policy_uuid: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
  
  @ManyToOne(() => Team, (teams) => teams.teamMembers)
  @JoinColumn({ name: 'team_uuid' })
  team: Team;


  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
