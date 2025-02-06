import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('calculated_logic')
export class CalculatedLogic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column('decimal')
  full_day_active_time: number;

  @Column('decimal')
  full_day_core_productive_time: number;

  @Column('decimal')
  full_day_idle_productive_time: number;

  @Column('decimal')
  full_day_productive_time: number;

  @Column('decimal')
  half_day_active_time: number;

  @Column('decimal')
  half_day_core_productive_time: number;

  @Column('decimal')
  half_day_idle_productive_time: number;

  @Column('decimal')
  half_day_productive_time: number;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}

