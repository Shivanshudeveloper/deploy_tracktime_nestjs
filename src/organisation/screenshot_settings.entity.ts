import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Policy } from "./trackingpolicy.entity";

@Entity('screenshot_settings')
export class ScreenshotSettings {
  @PrimaryGeneratedColumn('uuid')
  screenshot_id: string;

  @Column('uuid')
  organization_id: string;

  @Column({ default: true })
  monitoringStatus: boolean;

  @Column({ default: false })
  blurScreenshotsStatus: boolean;

  @Column('int')
  time_interval: number;

  @ManyToOne(() => Policy, (policy) => policy.policyId)
  policy: Policy;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}

