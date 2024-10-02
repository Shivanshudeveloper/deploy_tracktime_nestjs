import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('unique_apps')
export class UniqueApps {
  @PrimaryGeneratedColumn('uuid')
  u_apps_uuid: string;

  @Column()
  app_name: string;

  @Column()
  description: string;

  @Column()
  type: string;

  @Column()
  category_uuid: string;

  @Column()
  category_name: string;

  @Column()
  parent_category: string;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
