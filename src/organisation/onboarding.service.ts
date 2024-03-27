import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { S3 } from 'aws-sdk';
import { Devices } from './devices.entity';
import { validate } from 'class-validator';
import { Subscription } from './subscription.entity';

type UpdateConfigType = DeepPartial<User['config']>;

@Injectable()
export class OnboardingService {
  private s3:S3;
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
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(Devices)
    private devicesRepository: Repository<Devices>,
    private ConfigureService:ConfigService,
    @InjectRepository(Subscription)
    private SubscriptionRepository:Repository<Subscription>,

  ) {
    this.s3 = new S3({
      endpoint:this.ConfigureService.get<string>("WASABI_ENDPOINT"),
      accessKeyId:this.ConfigureService.get<string>('WASABI_ACCESS_KEY_ID'),
      secretAccessKey:this.ConfigureService.get<string>('WASABI_SECRET_ACCESS_KEY'),
      region:this.ConfigureService.get<string>('WASABI_REGION'),
    }); 
  } 

  async fetchScreenShot():Promise<any[]>{
    // const bucketName = process.env.WASABI_BUCKET_NAME;
    const bucketName = this.ConfigureService.get<string>("WASABI_BUCKET_NAME");
    const params = {
      Bucket:bucketName,
      Prefix:'thumbnails/'
    }
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const images = data.Contents.map(item=>({
        key:item.Key,
        lastModified:item.LastModified,
        size:item.Size,
        url: this.s3.getSignedUrl('getObject',{
          Bucket:bucketName,
          Key:item.Key,
          Expires: 60 * 5
        }),
      }));
      return images;
    } catch (error) {
      throw new Error(`Failed to fetch images from wasabi due to error:${error?.message}`);
    }
  }

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
    const FetchedData = await this.userActivityRepository.find({where:{user_uid:id}});
    const ImgData = await this.fetchScreenShot();
    const userData = await this.findAllUsers();

    if (!FetchedData) {
      throw new Error('User not found');
    }

    const userUnsortedData = FetchedData?.map(userD=>{
      ImgData.forEach(img=>{
        let imgAcctivity = img?.key.split("/")[1].split("|")[0];
        if(userD.activity_uuid === imgAcctivity){
          userD["ImgData"] = img;
        }
      }) 
      userData.map(user=>{
        if(user.userUUID === userD.user_uid){
          userD["user_name"] = user.userName;
        }
      })
      return userD;
    })

   

    userUnsortedData?.sort((a,b)=> 
    {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();

      return dateB - dateA
    });

    const skip = (page-1) * limit;
    const take = limit*page; 
    const userDataInLimit = userUnsortedData?.slice(skip,take)
    
    return userDataInLimit
    // const user = await this.userActivityRepository.find({ where: { user_uid:id },
    // skip,
    // take
    // }); 
  //  const userDetails = userUnsortedData?.slice(skip,take+1);

    // user?.sort((a,b)=> 
    // {
    //   const dateA = new Date(a.timestamp).getTime();
    //   const dateB = new Date(b.timestamp).getTime();

    //   return dateB - dateA
    // } );

    // return user;
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

  async getAllUserActivityData():Promise<UserActivity[]>{
    const userData = await this.userActivityRepository.find();
   
    return userData;
  }

  async validateOrganization(organid:string):Promise<boolean>{
    const organId= await this.organizationRepository.findOne({where: {id:organid}});
    if(organId?.id){
      return true
    }
    return false; 
  }

  async createDeviceForUser(organization_uid:string,mac_address:string,userName:string):Promise<String>{

    const deviceForUser = await this.devicesRepository.create({
      organization_uid,
      user_name:userName,
      user_uid:null,
      mac_address:mac_address,
    })
    
    const errors = await validate(deviceForUser);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
   const device = await this.devicesRepository.save(deviceForUser);
   console.log(device)
    return device?.device_uid;
  }

  async getUserDeviceId(deviceId:string){
    try {
      
      const device = await this.devicesRepository.find({where :{device_uid:deviceId}});

      console.log(device); 
      
      return device;

    } catch (error) {
      console.log(error)
    }
    return null;
  }
  async createDeviceIdForUser(mac_address:string,user_name:string,organizationId:string){
    try{
      // const isOrganizationExist = await this.organizationRepository.find({where: {}})
    }catch(err){

    }

  }

  async checkDeviceIdExist(mac_address :string ,device_user_name :string):Promise<String>{
    try{
      const isExist = await this.devicesRepository.findOne({where:{mac_address:mac_address}
        // where : {user_name:device_user_name} 
      });
      console.log(isExist);
      if(isExist?.user_name && isExist?.user_name.toLowerCase() === device_user_name.toLowerCase()){
        return isExist?.device_uid;
      }
      console.log(isExist?.user_name, device_user_name,isExist?.user_name==device_user_name);

      return null;
    }catch(err){
      console.log(err?.message)
      return null;
    }
  }

  async getUserConfig(deviceId: string, organizationId:string): Promise<any> {
    try {
      
      // Logic to fetch user details from your database or storage based on user ID
      const user = await this.devicesRepository.findOne({
        where: { device_uid: deviceId },
      });

      if (!user?.user_uid) {
        return {
          tracktimeStatus:"Resume",
          isPaid:false,
        };
      }

      // Assuming your User entity has a 'config' field
      // const { config } = user;

      const configUser = await this.userRepository.findOne({where :{userUUID:user?.user_uid}});
      const isPaid = await this.SubscriptionRepository.findOne({where :{organization_id:organizationId}});
      const config = configUser.config;
      // Return the user's configuration and track time status or modify as needed

      console.log('user', user);
      return {
        trackTimeStatus: config?.trackTimeStatus || 'Resume',
        isPaid: config?true:false,
      };
    } catch (error) {
      throw new Error('Failed to fetch user config');
    }
  }
}