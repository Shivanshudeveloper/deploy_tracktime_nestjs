import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('applications')
export class applcationEntity {
  @PrimaryGeneratedColumn('uuid')
  tool_uuid: string;

  @Column()
  tool_name: string;

  @Column()
  productivity_status: string;

  @Column('uuid')
  setting_uuid: string;

  @Column('uuid')
  policy_uuid: string;
}
