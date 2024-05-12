import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Team } from './team.entity';
import { User } from 'src/users/user.entity';
import { IsNotEmpty } from 'class-validator';

@Entity("organization")
  
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({ nullable: true })
  @IsNotEmpty()
  logo: string; // Assuming there's a logo field based on the keys

  @Column()
  @IsNotEmpty()
  country: string; // Assuming there's a country field

  // @Column('int')
  @IsNotEmpty()
  teamSize: string; // Changed type to 'int' to reflect 'INTEGER'

  @Column()
  @IsNotEmpty()
  type: string; // Assuming 'organization_type' maps to this

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Team, (team) => team.organization)
  teams: Team[];
}
