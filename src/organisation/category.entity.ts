import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  category_uuid: string;

  @Column()
  parent_category: string;

  @Column()
  category_name: string;
}
