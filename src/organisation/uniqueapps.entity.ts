import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
