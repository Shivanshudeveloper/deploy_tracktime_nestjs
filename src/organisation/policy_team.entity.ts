import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Policy } from './trackingpolicy.entity';
import { Team } from './team.entity';

@Entity('policy_teams')
export class PolicyTeams {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Policy, (policy) => policy.assignedTeams)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @ManyToOne(() => Team, (team) => team.id)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
