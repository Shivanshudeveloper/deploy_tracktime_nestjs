import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { CreateTeamDto } from './dto/team.dto';
import { UserActivity } from 'src/users/user_activity.entity';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(DesktopApplication)
    private desktopAppRepository: Repository<DesktopApplication>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>
  ) {}

  async createOrganization(data: any): Promise<Organization> {
    // const organization = this.organizationRepository.create({
    //   name: data.name,
    //   logo: data.logo || null, // Assuming logo can be null
    //   country: data.country,
    //   teamSize: data.teamSize,
    //   type: data.type,
    // });
    const organisation = new Organization();
    organisation.name = data.name;
    organisation.country = data.country;
    organisation.logo = data.logo;
    organisation.teamSize = data.teamSize;
    organisation.type = data.type;
    
    const savedOrganization = await this.organizationRepository.save(organisation);
    console.log('Saved Organization:', savedOrganization);
    return savedOrganization;
  }
  

  async createDesktopApplication(data: any): Promise<DesktopApplication> {
    const desktopApp = this.desktopAppRepository.create({
      name: data.name,
      logo: data.logo, // Assuming 'logo' is part of your data
    });
    const savedDesktopApp = await this.desktopAppRepository.save(desktopApp);
    console.log('Saved Desktop Application:', savedDesktopApp);
    return savedDesktopApp;
  }
  

  async createTeam(createTeamDto: CreateTeamDto): Promise<Team> {
    const team = this.teamRepository.create({ name: createTeamDto.name });

    if (createTeamDto.organizationId) {
      const organization = await this.organizationRepository.findOne({ where: { id: createTeamDto.organizationId } });
      if (!organization) {
        throw new Error('Organization not found');
      }
      team.organization = organization;
    }

    const savedTeam = await this.teamRepository.save(team);
    console.log('Saved Team:', savedTeam);
    return savedTeam;
  }
  
  async addUserToTeam(userId: string, teamId: string): Promise<User> {

    const user = await this.userRepository.findOne({ where: { userUUID: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new Error('Team not found');
      }

    user.team = team;
    const updatedUser = await this.userRepository.save(user);
    console.log('Updated User:', updatedUser);
    return updatedUser;

  }
  async findAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

 // In your OnboardingService

  async getUserDetails(id: string): Promise<UserActivity[]> {
    // If findOneBy is not recognized or you prefer a more explicit approach, use findOne:
    const user = await this.userActivityRepository.find({ where: { user_uid:id }}); 
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

}
