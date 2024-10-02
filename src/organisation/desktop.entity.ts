import { IsNotEmpty, IsString } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class DesktopApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  organizationId:string;

  @Column({ nullable: true })
  logo: string; // You can store the URL or path of the logo

  @Column()
  type: string; // the type of device

  @Column({default:'1.0.0'}) 
  version:string;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
