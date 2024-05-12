import { IsNotEmpty} from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity("OrganizationAdmin")

export class CreateOrganizationAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @IsNotEmpty()
  @Column()
  email: string;

  @IsNotEmpty()
  @Column()
  password: string;

  @Column({default:false})
  isAdmin: boolean = false;

  @Column()
  OrganizationId: string;
}
 