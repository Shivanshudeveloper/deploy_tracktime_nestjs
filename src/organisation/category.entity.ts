import { IsNotEmpty, IsString } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  category_uuid: string;

  @Column()
  parent_category: string;

  @Column()
  category_name: string;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
