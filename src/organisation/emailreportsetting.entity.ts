import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
