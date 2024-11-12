import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Policy } from './trackingpolicy.entity';

@Entity('tracking_weekdays')
export class TrackingWeekdays {
  @PrimaryGeneratedColumn('uuid')
  trackedW_id: string;

  @Column('uuid')
  day_uuid: string;

  @Column()
  day_name: string;

  @Column({ default: false })
  day_status: boolean;

  @Column('int')
  checkIn: number;

  @Column('int')
  checkOut: number;

  @Column('int')
  break_start: number;

  @Column('int')
  break_end: number;

  @ManyToOne(() => Policy, (policy) => policy.weekdays)  // Remove cascade here
  @JoinColumn({ name: 'policyId' })
  policy: Policy;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

