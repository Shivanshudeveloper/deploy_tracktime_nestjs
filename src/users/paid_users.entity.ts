import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('paid_users')
export class PaidUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: string; // or string, based on your User table's primary key type

  @Column()
  username: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
