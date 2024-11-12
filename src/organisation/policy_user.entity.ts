import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Policy } from './trackingpolicy.entity';
import { User } from 'src/users/user.entity';

@Entity('policy_users')
export class PolicyUsers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Policy, (policy) => policy.assignedUsers)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @ManyToOne(() => User, (user) => user.policies)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
