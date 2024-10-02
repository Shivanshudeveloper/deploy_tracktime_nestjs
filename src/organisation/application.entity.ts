import { IsNotEmpty, IsString } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
