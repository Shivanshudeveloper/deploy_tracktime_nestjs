import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Policy } from './trackingpolicy.entity';

@Entity('tracking_holidays')
export class TrackingHolidays {
  @PrimaryGeneratedColumn('uuid')
  trackedH_id: string;

  @Column()
  holiday_name: string;

  @Column()
  holiday_date: Date;

  @Column({ default: true })
  day_status: boolean;

  @ManyToOne(() => Policy, (policy) => policy.holidays)
  @JoinColumn({ name: 'policyId' }) // Specify the custom column name for policy relationship
  policy: Policy;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
