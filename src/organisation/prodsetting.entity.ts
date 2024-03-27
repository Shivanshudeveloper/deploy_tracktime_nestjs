import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('productivity_settings')
export class productivitySettingEntity {
  @PrimaryGeneratedColumn('uuid')
  setting_uuid: string;

  @Column('uuid')
  organization_uid: string;

  @Column()
  name: string;
  @Column()
  productivity_status: string;

  @Column({ type: 'json' })
  type: JSON;

  @Column('uuid')
  policy_uuid: string;
}
