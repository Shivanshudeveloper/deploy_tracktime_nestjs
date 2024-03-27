import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_policy')
export class trackingPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  policy_uuid: string;

  @Column('uuid')
  organization_uid: string;

  @Column()
  policy_name: string;

  @Column({ type: 'json' }) // This will store and retrieve the data as JSON
  policy_content: any;

  @Column('uuid')
  team_uuid: string;
}
