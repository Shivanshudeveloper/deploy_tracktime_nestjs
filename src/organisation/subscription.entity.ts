import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  user_uid: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column()
  invoice_status: string;

  @Column()
  invoice_link: string;

  @Column()
  invoice_date: string;
}
