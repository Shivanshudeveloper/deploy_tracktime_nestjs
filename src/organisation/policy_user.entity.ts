import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Policy } from "./trackingpolicy.entity";
import { User } from "src/users/user.entity";

@Entity('policy_users')
export class PolicyUsers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Policy, (policy) => policy.policyId)
  policy: Policy;

  @ManyToOne(() => User, (user) => user.policies)
  user: User;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
