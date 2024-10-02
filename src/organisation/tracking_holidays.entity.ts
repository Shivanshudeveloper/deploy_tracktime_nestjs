import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Policy } from "./trackingpolicy.entity";

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

  @ManyToOne(() => Policy, (policy) => policy.policyId)
  policy: Policy;

  // Use default camelCase format
  // @CreateDateColumn()
  // createdAt: Date;

  // @UpdateDateColumn()
  // updatedAt: Date;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
