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
    organisation.name = data.name.toLowerCase();
    organisation.country = data.country;
    organisation.logo = data.logo;
    organisation.teamSize = data.teamSize;
    organisation.type = data.type;
    
    const savedOrganization = await this.organizationRepository.save(organisation);
    console.log('Saved Organization:', savedOrganization);
    return savedOrganization;
  }
  

  async createDesktopApplication(data: any): Promise<DesktopApplication> {
    console.log(data);
    const desktopApp = new DesktopApplication();
    desktopApp.name = data?.name;
    desktopApp.logo = data?.logo || "http://example.com/favicon.ico";
    desktopApp.type = data?.type || "application";
    desktopApp.version = data?.version || "1.0.0";
    desktopApp.organizationId = data?.organizationId;

    // let error = validate(desktopApp);
    // if(error?.length > 0) {
    //   throw new BadRequestException({Error:"Error creating desktop Appplication",})
    // }

    const savedDesktopApp = await this.desktopAppRepository.save(desktopApp);
    console.log('Saved Desktop Application:', savedDesktopApp);
    return savedDesktopApp;
  }
  

  async findOrganization(name:string):Promise<Organization>{
      let isOrganization = await this.organizationRepository.findOne({where:{name}});

    return isOrganization ;
  }
  
  async createTeam(createTeamDto: CreateTeamDto): Promise<Team> {
    const teamId = await this.teamRepository.findOne({where:{name:createTeamDto.name}});
    if(teamId?.id){
      return teamId;
    }
    const team = await this.teamRepository.create({ name: createTeamDto?.name });
    const organization = await this.organizationRepository.findOne({where:{id:createTeamDto?.organizationId}});
    
    console.log("Organization",organization)
    
    if (createTeamDto?.organizationId) {
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
  async findAllUsers(Id:string): Promise<User[]> {
    return await this.userRepository.find({where :{organizationId:Id}});
  }

  async findUserById(Id:string): Promise<User> {
    return await this.userRepository.findOne({where :{userUUID:Id}});
  }
  async findAllDevices(organId:string): Promise<Devices[]> {
    console.log("organId",organId);
    let devices =  await this.devicesRepository.find({where:{organization_uid:organId}});
    let deviceInfo = await this.userActivityRepository.find({where:{organization_id:organId}});

    console.log("devices: " + devices)
    if(!devices?.length){
        return null;
    }
    console.log("devicesInfo: " +deviceInfo)

    devices = devices.map(item=>{
      console.log("device: " + item)
      deviceInfo.map(itemInfo=>{
        // console.log("status",itemInfo?.user_uid === item?.device_uid)
        if(itemInfo?.user_uid === item?.device_uid){
          item["deviceInfo"] = itemInfo;
        }
        return itemInfo;
      })
      return item;
    })
    
    console.log("devices",devices.map(item=>console.log(item["deviceInfo"])));
    return devices; 
  }
  async fetchAllOrganization(organId:string): Promise<Organization> {
    return await this.organizationRepository.findOne({where:{id:organId}});
  }
  async getAllTeam(organId:string):Promise<Team[]> {
    return await this.teamRepository.find({where:{organizationId:organId}});
  }
 // In your OnboardingService
  async getUserDetails(organId:string,id: string,page:number,limit:number): Promise<UserActivity[]> {
    //If findOneBy is not recognized or you prefer a more explicit approach, use findOne:
    //apply here the logic for sorting the data in timing format and then get's teh data wanted
    const FetchedData = await this.userActivityRepository.find({where:{user_uid:id}});
    console.log("fetched data", FetchedData)
    const ImgData = await this.fetchScreenShot();
    const userData = await this.findAllDevices(organId);

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
        if(user.device_uid === userD.user_uid){
          userD["user_name"] = user.user_name;
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
    console.log(page,limit,skip,take)
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

  async getAllUserActivityData(organId:string):Promise<UserActivity[]>{
    const userData = await this.userActivityRepository.find({where :{organization_id:organId}});
    console.log(userData);
    return userData;
  }

  async validateOrganization(organid:string):Promise<boolean>{
    const organId= await this.organizationRepository.findOne({where: {id:organid}});
    if(organId?.id){
      return true
    }
    return false; 
  }

  async createDeviceForUser(organization_uid: string, userName: string, email: string, user_uid: string, mac_address: string): Promise<string> {
    console.log("Entering device creation");

    // Check if a device already exists for the user
    const isDeviceAlreadyExist = await this.devicesRepository.findOne({ where: { user_uid: user_uid } });
    console.log("Device already exists:", isDeviceAlreadyExist);
    
    if (isDeviceAlreadyExist) {
        return isDeviceAlreadyExist.device_uid;
    }
    
    // Efficiently find the last device with the highest number
    const lastDevice = await this.devicesRepository.createQueryBuilder("device")
                        .orderBy("device.device_name", "DESC")
                        .getOne();

    let nextDeviceNumber = 1;
    if (lastDevice?.device_name) {
        const lastNumber = parseInt(lastDevice.device_name.split('-')[1]);  // Assuming device name format "Device-X"
        nextDeviceNumber = lastNumber + 1;
    }
    
    const deviceName = `Device-${nextDeviceNumber}`;

    // Create the device for the user
    console.log(deviceName)
    const deviceForUser = await this.devicesRepository.create({
        organization_uid,
        user_name: userName,
        user_uid: user_uid ? user_uid : null,
        mac_address: mac_address ? mac_address : null,
        device_name: deviceName
    });
    
    // Save the new device to the database
    await this.devicesRepository.save(deviceForUser);  // Make sure to save the new device
    console.log("deviceForUser",deviceForUser)

    console.log("Created device:", deviceForUser.device_uid);
    return deviceForUser.device_uid; 
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

  async checkDeviceIdExist(mac_address :string ,device_user_name :string):Promise<string>{
    try{
      const isExist = await this.devicesRepository.findOne({where:{mac_address}
        // where : {user_name:device_user_name} 
      });
      console.log("mac_address",mac_address);
      console.log("device-user-name",device_user_name);
      console.log("isExist",isExist);
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
  async checkDeviceIdExistWithDeviceId(device_id :string ,device_user_name :string):Promise<string>{
    try{
      const isExist = await this.devicesRepository.findOne({where:{device_uid:device_id}
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
 
  async findDesktopApplication(orgId:string):Promise<any>{

    try {
      let desktopApp = await this.desktopAppRepository.findOne({where :{organizationId:orgId}}); 
      return desktopApp;
    } catch (error) {
      throw new BadRequestException(`Error:- ${error}`);
    }
  } 

  async findAllTeamsForOrganization(orgId: string): Promise<any> {
    try {
        const organizationTeams = await this.teamRepository.find({ where: { organizationId: orgId } });
        if (organizationTeams?.length) {
            const teamData = await Promise.all(organizationTeams.map(async (team) => {
                const teamMembers = await this.userRepository.find({ where: { teamId: team.id } });
                return {
                    ...team,
                    teamMembersCount: teamMembers.length,
                    teamMembers: teamMembers
                };
            }));
            console.log("Team data: ", teamData);
            return teamData;
        }
        return [];
    } catch (error) {
        throw new BadRequestException(`Error: ${error.message}`);
    }
}

async findTeamForOrganizationWithId(organId: string,teamId:string): Promise<Team>{
  try{
    let isExistTeam = await this.teamRepository.findOne({where:{id:teamId}});

    // if(isExistTeam?.id){

    // }
      return isExistTeam;

  }catch(err){
    throw new BadRequestException(`Error:- ${err?.message}`);
  }
}

 async findTeamForOrganization(organId:string,teamId:string):Promise<any>{
  try {
    let isExitTeam = await this.teamRepository.find({where :{organizationId:organId}});

    if(!isExitTeam.length) {
      return false;
    }
    let team = isExitTeam.find(team=>team.name == teamId);
    return team;
    
  } catch (error) {
    throw new BadRequestException(`Error:- ${error}`);
  }
 }
 async ValidateUserByGmail(email:string){
  try{
    let user = await this.userRepository.findOne({where: {email: email}});
    return user
  }catch(err){
    throw new BadRequestException(`Error: ${err}`);
  }
 } 
}