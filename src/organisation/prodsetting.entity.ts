import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Policy } from './trackingpolicy.entity';

@Entity('productivity_settings')
export class ProductivitySettingEntity {
  @PrimaryGeneratedColumn('uuid')
  setting_uuid: string;

  @Column('uuid')
  organization_uid: string;

  @Column()
  name: string;
  
  @Column()
  productivity_status: string;

  @Column({ type: 'json' })
  type: JSON;

  @ManyToMany(() => Policy, (policy) => policy.policyId) // Change ManyToOne to ManyToMany
  @JoinTable({
    name: 'productivity_policy', // Custom join table
    joinColumn: { name: 'setting_uuid', referencedColumnName: 'setting_uuid' },
    inverseJoinColumn: { name: 'policy_id', referencedColumnName: 'policyId' },
  })
  policyList: Policy[]; // List of policies

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
