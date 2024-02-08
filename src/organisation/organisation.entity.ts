import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Team } from './team.entity';
import { User } from 'src/users/user.entity';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string; // Assuming there's a logo field based on the keys

  @Column()
  country: string; // Assuming there's a country field

  @Column('int')
  teamSize: number; // Changed type to 'int' to reflect 'INTEGER'

  @Column()
  type: string; // Assuming 'organization_type' maps to this

  @OneToMany(() => User, user => user.organization)
  users: User[];

  @OneToMany(() => Team, team => team.organization)
  teams: Team[];
}
