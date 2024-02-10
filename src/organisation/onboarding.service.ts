import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { Repository } from 'typeorm';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { CreateTeamDto } from './dto/team.dto';
import { UserActivity } from 'src/users/user_activity.entity';
import { DeepPartial } from 'typeorm';
import { prototype } from 'events';
type UpdateConfigType = DeepPartial<User['config']>;

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
  async getUserDetails(id: string,page:number,limit:number): Promise<UserActivity[]> {
    // If findOneBy is not recognized or you prefer a more explicit approach, use findOne:
    //apply here the logic for sorting the data in timing format and then get's teh data wanted
    // const userUnsortedData = await this.userActivityRepository.find({where:{user_uid:id}});

    // userUnsortedData?.sort((a,b)=> 
    // {
    //   const dateA = new Date(a.timestamp).getTime();
    //   const dateB = new Date(b.timestamp).getTime();

    //   return dateB - dateA
    // });

    const skip = (page-1) * limit;
    const take = limit; 
    const user = await this.userActivityRepository.find({ where: { user_uid:id },
    skip,
    take
    }); 
  //  const userDetails = userUnsortedData?.slice(skip,take+1);
    if (!user) {
      throw new Error('User not found');
    }

    user?.sort((a,b)=> 
    {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();

      return dateB - dateA
    } );

    return user;
  }

  async getUserDataCount(id:string):Promise<Number>{
    const userDataCount = await this.userActivityRepository.find({where:{user_uid:id}});
   
    return userDataCount?.length;
  }

  //service for updating user configs
  async updateUserConfig(id:string,status:string):Promise<User>{
     
    if(!id){
      return null;
    }

    let userDetails = await this.userRepository.findOne({where :{userUUID:id}})
    
    if (!userDetails) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    let updatedConfig :UpdateConfigType = {
      trackTimeStatus:status as TrackTimeStatus
    }
    try {
      await this.userRepository.update({userUUID:id},{config:updatedConfig}) 

      userDetails = await this.userRepository.findOne({where:{userUUID:id}});
      return userDetails;
      
    } catch (error) {
      console.log(`Failed to update user configuration: ${error.message}`)
      throw new Error(`Failed to update user configuration: ${error.message}`)
    }
    
  }
}
