import { TrackTimeStatus } from 'src/users/user.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('registeredusers')
export class RegisteredUser {
  @PrimaryGeneratedColumn('uuid')
  user_uid: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column()
  first_name: string;

  @Column({ type: 'uuid' })
  last_name: string;

  @Column({ type: 'uuid' })
  organization_name: string;

  @Column()
  team_id: string;

  @Column({ type: 'uuid' })
  type: number;

  @Column('json', { nullable: true })
  config: {
    trackTimeStatus: TrackTimeStatus;
  };
}
