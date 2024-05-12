import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Organization } from './organisation.entity';
import { User } from 'src/users/user.entity';

@Entity("team")
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  organizationId: string;

  @OneToMany(() => User, (user) => user.team)
  users: User[];

  // @Column({ type: 'uuid' })
  // policy_uuid: string;

  @ManyToOne(() => Organization, (organization) => organization.teams)
  organization: Organization;
 
  @OneToMany(() => User, (teamMember) => teamMember.teamId)
  teamMembers: User[];
}

// New format data follow this

// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
// import { Organization } from './organisation.entity';
// import { User } from 'src/users/user.entity';

// @Entity()
// export class Team {
//   @PrimaryGeneratedColumn('uuid')
//   uuid: string; // Changed to uuid to match your schema

//   @Column({ nullable: true }) // Assuming the foreign key can be nullable or adjust accordingly
//   organizationId: string; // This should be just an ID field if you're manually handling the relation

//   @ManyToOne(() => Organization, organization => organization.teams)
//   organization: Organization; // This establishes the relationship

//   // Assuming there's a Policy entity you're relating to
//   @Column({ nullable: true }) // Adjust based on actual requirements
//   policyUuid: string; // Placeholder for policy foreign key

//   @Column()
//   name: string;

//   @Column()
//   manager: string; // Added based on schema

//   @Column()
//   status: string; // Added based on schema

//   // Relationship with User
//   @OneToMany(() => User, user => user.team)
//   users: User[];
// }
