import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TeamMember } from './teammembers.entity';
import { User } from 'src/users/user.entity';

@Entity()
export class Teams {
  @PrimaryGeneratedColumn('uuid')
  team_uuid: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  policy_uuid: string;

  @Column()
  name: string;

  @Column()
  status: number;

  @OneToMany(() => User, (teamMember) => teamMember.teamId)
  teamMembers: TeamMember[];
}
