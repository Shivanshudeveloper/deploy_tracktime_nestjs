import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DesktopApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string; // You can store the URL or path of the logo

  @Column()
  type: string; // the type of device
}
