import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Policy } from "./trackingpolicy.entity";
import { Team } from "./team.entity";

@Entity('policy_teams')
export class PolicyTeams {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Policy, (policy) => policy.policyId)
  policy: Policy;

  @ManyToOne(() => Team, (team) => team.policies)
  team: Team;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
