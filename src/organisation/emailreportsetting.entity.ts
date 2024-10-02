import { IsNotEmpty, IsString } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('emailreportsettings')
export class EmailReportSettings {
  @PrimaryGeneratedColumn('uuid')
  user_uid: string;

  @Column({ type: 'uuid' })
  organization_id: string;
 
  @Column()
  monthly: boolean;

  @Column()
  weekly: boolean;

  @Column()
  daily: boolean;

  @Column()
  type: string;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
