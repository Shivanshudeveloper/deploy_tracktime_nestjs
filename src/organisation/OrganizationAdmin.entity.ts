import { IsNotEmpty} from 'class-validator';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity("OrganizationAdmin")
export class CreateOrganizationAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  name: string; // Keep for backward compatibility

  @IsNotEmpty()
  @Column()
  email: string;

  @IsNotEmpty()
  @Column()
  password: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  avatar: string; // URL to avatar image

  @Column({ default: false })
  isAdmin: boolean = false;

  @Column({ nullable: true, default: null })
  OrganizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}