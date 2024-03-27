import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('desktop_app')
export class DesktopAppEntity {
  @PrimaryGeneratedColumn('uuid')
  team_uid: string;

  @Column('uuid')
  user_uuid: string;

  @Column('uuid')
  organization_id: string;

  @Column({ type: 'json' }) // This will store and retrieve the data as JSON
  policy_content: any;

  @Column('uuid')
  policy_uuid: string;
}
