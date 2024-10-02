import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { Between, Repository } from 'typeorm';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { CreateTeamDTO } from './dto/teams.dto';
import { UserActivity } from 'src/users/user_activity.entity';
import { DeepPartial } from 'typeorm';
import { prototype } from 'events';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { S3 } from 'aws-sdk';
import { Devices } from './devices.entity';
import { validate } from 'class-validator';
import { Subscription } from './subscription.entity';
import axios from 'axios';
import { CalculatedLogic } from './calculatedLogic.entity';
import { AttendanceDto } from './dto/attendance.dto';
import { CreateCalculatedLogicDto } from './dto/calculatedLogic.dto';
import { CreateOrganizationDTO } from './dto/organization.dto';
import { Policy } from './trackingpolicy.entity';
import { TrackingPolicyDTO } from './dto/tracingpolicy.dto';
const DeployFlaskBaseApi = 'https://python-link-classification-stac.onrender.com';
const LocalFlaskBaseApi = 'http://127.0.0.1:5000';
type UpdateConfigType = DeepPartial<User['config']>;

@Injectable()
export class OnboardingService {
  private s3: S3;
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-06-28`; // Flask API URL
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-07-14`; // Flask API URL
  private flaskBaseApiUrl = `${DeployFlaskBaseApi}/calculate_hourly_productivity`;
  private readonly logger = new Logger(OnboardingService.name);
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
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
    private ConfigureService: ConfigService,
    @InjectRepository(Subscription)
    private SubscriptionRepository: Repository<Subscription>,
    @InjectRepository(CalculatedLogic)
    private calculatedLogicRepository: Repository<CalculatedLogic>,
  ) {
    this.s3 = new S3({
      endpoint: this.ConfigureService.get<string>('WASABI_ENDPOINT'),
      accessKeyId: this.ConfigureService.get<string>('WASABI_ACCESS_KEY_ID'),
      secretAccessKey: this.ConfigureService.get<string>(
        'WASABI_SECRET_ACCESS_KEY',
      ),
      region: this.ConfigureService.get<string>('WASABI_REGION'),
    });
  }
  async getOrganizationDetails(id:string):Promise<Organization> {
    console.log("id", id);
    if(id){
      let organization = await this.organizationRepository.findOne({where :{id}});
      console.log("organization",organization);
      return organization;
    }
    return null;
  }
  async updateOrganization(Organization:Organization,data:CreateOrganizationDTO):Promise<string>{
    console.log(data)
      try {
      const orga =await this.organizationRepository.findOne({where:{id:Organization?.id}});
      if(orga?.id){
        data?.country && (orga.country = data.country);
        data?.timeZone && (orga.timeZone = data.timeZone);
        data?.name && (orga.name = data.name);
        data?.logo && (orga.logo = data.logo);
        await this.organizationRepository.save(orga);
        return orga.id;
    }
      return null;
    } catch (error) {
      console.log({error:error.message});
      return null;
  }
  }
  async fetchScreenShot(): Promise<any[]> {
    // const bucketName = process.env.WASABI_BUCKET_NAME;
    const bucketName = this.ConfigureService.get<string>('WASABI_BUCKET_NAME');
    const params = {
      Bucket: bucketName,
      Prefix: 'thumbnails/',
    };
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const images = data.Contents.map((item) => ({
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        url: this.s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: item.Key,
          Expires: 60 * 5,
        }),
      }));
      return images;
    } catch (error) {
      throw new Error(
        `Failed to fetch images from wasabi due to error:${error?.message}`,
      );
    }
  }

  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
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
    organisation.timeZone = data.timeZone || null;
    const savedOrganization =
      await this.organizationRepository.save(organisation);
    console.log('Saved Organization:', savedOrganization);
    return savedOrganization;
  }

  async createDesktopApplication(data: any): Promise<DesktopApplication> {
    console.log(data);
    const desktopApp = new DesktopApplication();
    desktopApp.name = data?.name;
    desktopApp.logo = data?.logo || 'http://example.com/favicon.ico';
    desktopApp.type = data?.type || 'application';
    desktopApp.version = data?.version || '1.0.0';
    desktopApp.organizationId = data?.organizationId;

    // let error = validate(desktopApp);
    // if(error?.length > 0) {
    //   throw new BadRequestException({Error:"Error creating desktop Appplication",})
    // }

    const savedDesktopApp = await this.desktopAppRepository.save(desktopApp);
    console.log('Saved Desktop Application:', savedDesktopApp);
    return savedDesktopApp;
  }

  async findOrganization(name: string): Promise<Organization> {
    let isOrganization = await this.organizationRepository.findOne({
      where: { name },
    });

    return isOrganization;
  }

  async createTeam(createTeamDto: CreateTeamDTO): Promise<Team> {
    console.log('createTeamDto:', createTeamDto);

    // Check if a team with the same name already exists
    const existingTeam = await this.teamRepository.find({
      where: { organizationId: createTeamDto?.organizationId },
    });
    const isExistTeam = existingTeam.find(
      (t) => t?.name === createTeamDto.name,
    );
    if (existingTeam?.length && isExistTeam?.id) {
      console.log('Existing team found:', existingTeam);
      return isExistTeam;
    }

    // Create a new team instance
    const team = this.teamRepository.create({ name: createTeamDto?.name });
    console.log('First team created:', team);

    if (createTeamDto?.organizationId) {
      console.log(
        'Entered organization check with organizationId:',
        createTeamDto.organizationId,
      );

      // Find the organization by the given organizationId
      const organization = await this.organizationRepository.findOne({
        where: { id: createTeamDto.organizationId },
      });

      console.log('Organization found:', organization);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Assign the organization to the team
      team.organization = organization;
    }

    // Save the team and return it
    const savedTeam = await this.teamRepository.save(team);
    console.log('Saved Team:', savedTeam);

    return savedTeam;
  }

  async addUserToTeam(userId: string, teamId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userUUID: userId },
    });
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
  async findAllUsers(Id: string): Promise<User[]> {
    return await this.userRepository.find({ where: { organizationId: Id } });
  } 

  async findUserById(Id: string): Promise<User> {
    return await this.userRepository.findOne({ where: { userUUID: Id } });
  }
  async findAllDevices(organId: string): Promise<Devices[]> {
    console.log('organId', organId);
    let devices = await this.devicesRepository.find({
      where: { organization_uid: organId },
    });
    let deviceInfo = await this.userActivityRepository.find({
      where: { organization_id: organId },
    });

    console.log('devices: ' + devices);
    if (!devices?.length) {
      return null;
    }
    console.log('devicesInfo: ' + deviceInfo);

    devices = devices.map((item) => {
      console.log('device: ' + item);
      deviceInfo.map((itemInfo) => {
        // console.log("status",itemInfo?.user_uid === item?.device_uid)
        if (itemInfo?.user_uid === item?.device_uid) {
          item['deviceInfo'] = itemInfo;
        }
        return itemInfo;
      });
      return item;
    });

    console.log(
      'devices',
      devices.map((item) => console.log(item['deviceInfo'])),
    );
    return devices;
  }
  async fetchAllOrganization(organId: string): Promise<Organization> {
    return await this.organizationRepository.findOne({
      where: { id: organId },
    });
  }
  async getAllTeam(organId: string): Promise<Team[]> {
    return await this.teamRepository.find({
      where: { organizationId: organId },
    });
  }
  // In your OnboardingService
  async getUserDetails(
    organId: string,
    id: string,
    page: number,
    limit: number,
  ): Promise<UserActivity[]> {
    //If findOneBy is not recognized or you prefer a more explicit approach, use findOne:
    //apply here the logic for sorting the data in timing format and then get's teh data wanted
    const FetchedData = await this.userActivityRepository.find({
      where: { user_uid: id },
    });
    console.log('fetched data', FetchedData);
    const ImgData = await this.fetchScreenShot();
    const userData = await this.findAllDevices(organId);

    if (!FetchedData) {
      throw new Error('User not found');
    }

    const userUnsortedData = FetchedData?.map((userD) => {
      ImgData.forEach((img) => {
        let imgAcctivity = img?.key.split('/')[1].split('|')[0];
        if (userD.activity_uuid === imgAcctivity) {
          userD['ImgData'] = img;
        }
      });
      userData.map((user) => {
        if (user.device_uid === userD.user_uid) {
          userD['user_name'] = user.user_name;
        }
      });
      return userD;
    });

    userUnsortedData?.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();

      return dateB - dateA;
    });

    const skip = (page - 1) * limit;
    const take = limit * page;
    const userDataInLimit = userUnsortedData?.slice(skip, take);
    console.log(page, limit, skip, take);
    return userDataInLimit;
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

  async getUserDataCount(id: string): Promise<Number> {
    const userDataCount = await this.userActivityRepository.find({
      where: { user_uid: id },
    });

    return userDataCount?.length;
  }

  //service for updating user configs
  async updateUserConfig(id: string, status: string): Promise<Devices> {
    if (!id) {
      return null;
    }

    let userDetails = await this.devicesRepository.findOne({
      where: { device_uid: id },
    });

    if (!userDetails) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // console.log('status',status);
    let updatedConfig: UpdateConfigType = {
      trackTimeStatus: status as TrackTimeStatus,
    };
    try {
      await this.devicesRepository.update(
        { device_uid: id },
        { config: updatedConfig },
      );
      userDetails = await this.devicesRepository.findOne({
        where: { device_uid: id },
      });
      return userDetails;
    } catch (error) {
      console.log(`Failed to update user configuration: ${error.message}`);
      throw new Error(`Failed to update user configuration: ${error.message}`);
    }
  }

  async getAllUserActivityData(organId: string): Promise<UserActivity[]> {
    const userData = await this.userActivityRepository.find({
      where: { organization_id: organId },
    });
    console.log(userData);
    return userData;
  }

  async validateOrganization(organid: string): Promise<boolean> {
    const organId = await this.organizationRepository.findOne({
      where: { id: organid },
    });
    if (organId?.id) {
      return true;
    }
    return false;
  }

  async createDeviceForUser(
    organization_uid: string,
    userName: string,
    email: string,
    user_uid: string,
    mac_address: string,
  ): Promise<string> {
    console.log('Entering device creation');

    // Check if a device already exists for the user
    const isDeviceAlreadyExist = await this.devicesRepository.findOne({
      where: { user_uid: user_uid },
    });
    console.log('Device already exists:', isDeviceAlreadyExist);

    if (isDeviceAlreadyExist) {
      return isDeviceAlreadyExist.device_uid;
    }

    // Efficiently find the last device with the highest number
    const lastDevice = await this.devicesRepository
      .createQueryBuilder('device')
      .orderBy('device.device_name', 'DESC')
      .getOne();

    let nextDeviceNumber = 1;
    if (lastDevice?.device_name) {
      const lastNumber = parseInt(lastDevice.device_name.split('-')[1]); // Assuming device name format "Device-X"
      nextDeviceNumber = lastNumber + 1;
    }

    const deviceName = `Device-${nextDeviceNumber}`;

    // Create the device for the user
    console.log(deviceName);
    const deviceForUser = await this.devicesRepository.create({
      organization_uid,
      user_name: userName,
      user_uid: user_uid ? user_uid : null,
      mac_address: mac_address ? mac_address : null,
      device_name: deviceName,
    });

    // Save the new device to the database
    await this.devicesRepository.save(deviceForUser); // Make sure to save the new device
    console.log('deviceForUser', deviceForUser);

    console.log('Created device:', deviceForUser.device_uid);
    return deviceForUser.device_uid;
  }

  async getUserDeviceId(deviceId: string) {
    try {
      const device = await this.devicesRepository.find({
        where: { device_uid: deviceId },
      });

      console.log(device);

      return device;
    } catch (error) {
      console.log(error);
    }
    return null;
  }
  async createDeviceIdForUser(
    mac_address: string,
    user_name: string,
    organizationId: string,
  ) {
    try {
      // const isOrganizationExist = await this.organizationRepository.find({where: {}})
    } catch (err) {}
  }

  async checkDeviceIdExist(
    mac_address: string,
    device_user_name: string,
  ): Promise<string> {
    try {
      const isExist = await this.devicesRepository.findOne({
        where: { mac_address },
        // where : {user_name:device_user_name}
      });
      console.log('mac_address', mac_address);
      console.log('device-user-name', device_user_name);
      console.log('isExist', isExist);
      if (
        isExist?.user_name &&
        isExist?.user_name.toLowerCase() === device_user_name.toLowerCase()
      ) {
        return isExist?.device_uid;
      }
      console.log(
        isExist?.user_name,
        device_user_name,
        isExist?.user_name == device_user_name,
      );

      return null;
    } catch (err) {
      console.log(err?.message);
      return null;
    }
  }
  async checkDeviceIdExistWithDeviceId(
    mac_address: string,
    device_id: string,
    device_user_name: string,
  ): Promise<string> {
    try {
      // Find the device with the given device UID or mac_address in a single query to optimize DB hits
      let existingDevice = await this.devicesRepository.findOne({
        where: [{ device_uid: device_id }, { mac_address: mac_address }],
      });

      // If no device is found with device_id, update mac_address if required
      if (existingDevice && !existingDevice.mac_address && mac_address) {
        const conflictingDevice = await this.devicesRepository.findOne({
          where: { mac_address: mac_address },
        });

        // Remove conflicting mac_address if found
        if (conflictingDevice) {
          conflictingDevice.mac_address = null;
          await this.devicesRepository.save(conflictingDevice);
        }

        existingDevice.mac_address = mac_address;
        await this.devicesRepository.save(existingDevice);

        return existingDevice.device_uid;
      }

      return existingDevice ? existingDevice.device_uid : null;
    } catch (error) {
      this.logger.error(`Error checking device ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserConfig(deviceId: string, organizationId: string): Promise<any> {
    try {
      // Log the input parameters for debugging
      this.logger.debug(`Fetching user config for device: ${deviceId}, organization: ${organizationId}`);
  
      // Validate that deviceId and organizationId are not null or empty
      if (!deviceId || !organizationId) {
        this.logger.error(`Invalid input: deviceId or organizationId is missing.`);
        throw new Error('Invalid input: deviceId or organizationId is missing.');
      }
  
      // Fetch the user config from the database
      let userConfig = await this.devicesRepository.findOne({
        where: { device_uid: deviceId, organization_uid: organizationId },
      });
  
      if (!userConfig) {
        this.logger.warn(`User config not found for device ${deviceId} and organization ${organizationId}`);
        throw new Error(`User config not found for device ${deviceId} and organization ${organizationId}`);
      }
  
      // Check if the config is null and update it with default value if necessary
      if (!userConfig.config) {
        this.logger.log(`User config is null. Setting default config: { trackTimeStatus: 'Resume' } for device: ${deviceId}`);
  
        // Update the config field
        userConfig.config = { trackTimeStatus: TrackTimeStatus.Resume };
        
        // Save the updated user config back to the database
        await this.devicesRepository.save(userConfig);
        
        this.logger.log(`Default config set successfully for device: ${deviceId}`);
      }
  
      this.logger.debug(`User config fetched successfully: ${JSON.stringify(userConfig)}`);
      return userConfig;
    } catch (error) {
      // Log the error with details to identify the cause
      this.logger.error(`Failed to fetch or update user config: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch or update user config: ${error.message}`);
    }
  }
  
  

  async findDesktopApplication(orgId: string): Promise<any> {
    try {
      let desktopApp = await this.desktopAppRepository.findOne({
        where: { organizationId: orgId },
      });
      return desktopApp;
    } catch (error) {
      throw new BadRequestException(`Error:- ${error}`);
    }
  }

  async findAllTeamsForOrganization(orgId: string): Promise<any> {
    try {
      const organizationTeams = await this.teamRepository.find({
        where: { organizationId: orgId },
      });
      if (organizationTeams?.length) {
        const teamData = await Promise.all(
          organizationTeams.map(async (team) => {
            const teamMembers = await this.userRepository.find({
              where: { teamId: team.id },
            });
            return {
              ...team,
              teamMembersCount: teamMembers.length,
              teamMembers: teamMembers,
            };
          }),
        );
        console.log('Team data: ', teamData);
        return teamData;
      }
      return [];
    } catch (error) {
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  async findTeamForOrganizationWithId(
    organId: string,
    teamId: string,
  ): Promise<Team> {
    try {
      let isExistTeam = await this.teamRepository.findOne({
        where: { id: teamId },
      });

      // if(isExistTeam?.id){

      // }
      return isExistTeam;
    } catch (err) {
      throw new BadRequestException(`Error:- ${err?.message}`);
    }
  }

  async findTeamForOrganization(
    organId: string,
    teamName: string,
  ): Promise<any> {
    try {
      let isExistTeam = await this.teamRepository.find({
        where: { organizationId: organId },
      });
      console.log('isExistTeam', isExistTeam);
      if (!isExistTeam.length) {
        return false;
      }
      let team = isExistTeam.find(
        (team) => team.name.toLowerCase() === teamName.toLowerCase(),
      );

      return team;
    } catch (error) {
      throw new BadRequestException(`Error:- ${error}`);
    }
  }
  async ValidateUserByGmail(email: string) {
    try {
      let user = await this.userRepository.findOne({ where: { email: email } });
      return user;
    } catch (err) {
      throw new BadRequestException(`Error: ${err}`);
    }
  }

  async validateDeviceById(id: string): Promise<Devices> {
    const device = await this.devicesRepository.findOne({
      where: { device_uid: id },
    });

    return device;
  }
  async updateDevice(device: Devices): Promise<Devices> {
    return await this.devicesRepository.save(device);
  }
  async validateUserIdLinked(userId: string, deviceId: string): Promise<any> {
    const isExist = await this.devicesRepository.findOne({
      where: { user_uid: userId },
    });
    if (isExist?.device_uid) {
      isExist.user_uid = null;
    }
    await this.devicesRepository.save(isExist);
    return isExist.device_uid;
  }

  async getProductivityData(
    organizationId: string,
    date: string,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.flaskBaseApiUrl}?date=${date}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          organization_uid: organizationId,
          date: date,
        },
      });
      console.log('flask_data: ' + response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data from Flask API: ${error.message}`);
    }
  }

  async getWeeklyAttendance(organizationId: string, fromDate: Date, toDate: Date): Promise<AttendanceDto[]> {
    const calculatedLogic = await this.calculatedLogicRepository.findOne({ where: { organization_id:organizationId } });
    console.log("calculatedLogic", calculatedLogic);
    if (!calculatedLogic) {
      throw new NotFoundException('CalculatedLogic not found for the organization');
    }
    console.log(organizationId);
    const devices = await this.devicesRepository.find({where:{organization_uid:organizationId}});
    console.log("devices",devices);
    const attendanceData: AttendanceDto[] = [];
    
    for (const device of devices) {
      // const testUserActivite = await this.userActivityRepository.find({where:{user_uid:device.device_uid,timestamp:Between(fromDate,toDate),organization_id:device.organization_uid}})
      // console.log('testUserActivite', testUserActivite);
      const userActivities = await this.userActivityRepository.find({
        where: {
          // organization_id: device.organization_uid, 

          // NOTE: here the organizationId is different in user_activity table then in device table for the user, I think due to 
          //  rust application dev_config is alwasy set to same organizationId that's why it's giving the different organizationId here.
          // fix this issue later on.
          timestamp: Between(fromDate, toDate),
          user_uid:device.device_uid,          
        },
        order: { timestamp: 'ASC' },
      });
      console.log("userActivities",userActivities)

      const recordsOfWeek: any[] = [];

      const days = this.getDateRange(fromDate, toDate);
      for (const day of days) {
        const activitiesOfDay = userActivities.filter(activity => 
          activity.timestamp >= day.start && activity.timestamp <= day.end
        );

        let status = 'absent';
        console.log(activitiesOfDay.length)
        // activitiesOfDay.length && activitiesOfDay.forEach(activity =>{
        //   console.log("Name: ",activity.device_user_name,activity.page_title);
        // });
        if (activitiesOfDay.length > 0) {
          const firstActivity = activitiesOfDay[0];
          const lastActivity = activitiesOfDay[activitiesOfDay.length - 1];
          const workDuration = (lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime()) / (1000 * 60 * 60);

          console.log("workDuration: " + workDuration)
          console.log("fullDayActiveTime for the organization: " + calculatedLogic?.full_day_active_time)
          console.log("HalfDayActiveTime for the organization:: " + calculatedLogic?.half_day_active_time)

          if (workDuration >= calculatedLogic.full_day_active_time) {
            status = 'fullDay'; 
          } else if (workDuration >= calculatedLogic.half_day_active_time) {
            status = 'halfDay';
          }
        } else {
          const isHoliday = this.isHoliday(day.start);
          if (isHoliday) {
            status = 'holiday';
          }
        }

        const dateString = day.start.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        });
        recordsOfWeek.push({
          Date: dateString,
          DateStatus: status,
        });
      }

      const attendanceDto: AttendanceDto = {
        device_id: device.device_uid,
        user_name: device.user_name,
        user_id: device.user_uid,
        totalworkdays: days.length,
        holiday: recordsOfWeek.filter(record => record.DateStatus === 'holiday').length,
        recordsofWeek: recordsOfWeek,
      };

      attendanceData.push(attendanceDto);
    }

    return attendanceData;
  }

  private getDateRange(startDate: Date, endDate: Date): { start: Date; end: Date }[] {
    const dateRange: { start: Date; end: Date }[] = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);

      dateRange.push({ start, end });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateRange;
  }

  private isHoliday(date: Date): boolean {
    // Assuming Saturday (6) and Sunday (0) as holidays
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  async createCalculatedLogic(data: Partial<CreateCalculatedLogicDto>, organizationId: string): Promise<CalculatedLogic> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    console.log("organization",organization)
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const isExistCalculatedLogic = await this.calculatedLogicRepository.findOne({where:{organization_id:organizationId}});
    console.log("isExistCalculatedLogic", isExistCalculatedLogic);
    if(!isExistCalculatedLogic?.id){
      console.log("data",data)
      const calculatedLogic = this.calculatedLogicRepository.create({
        organization_id:organization?.id,
        full_day_active_time:data.fullDayActiveTime,
        full_day_core_productive_time:data.fullDayCoreProductiveTime,
        half_day_active_time:data.halfDayActiveTime,
        half_day_core_productive_time:data.halfDayCoreProductiveTime
      });
      return this.calculatedLogicRepository.save(calculatedLogic);
    }
    console.log(data)
    if(data.fullDayCoreProductiveTime && data.halfDayActiveTime ){
      isExistCalculatedLogic.full_day_active_time = data.fullDayActiveTime;
      isExistCalculatedLogic.full_day_core_productive_time = data.fullDayCoreProductiveTime;
      isExistCalculatedLogic.half_day_active_time = data.halfDayActiveTime;
      isExistCalculatedLogic.half_day_core_productive_time = data.halfDayCoreProductiveTime;
    }
    
    return this.calculatedLogicRepository.save(isExistCalculatedLogic);    
  }

  async getCalculatedLogicByOrganization(organizationId: string): Promise<CalculatedLogic> {
    return this.calculatedLogicRepository.findOne({ where: { organization_id :organizationId} });
  }

    // Create a new policy
    async createPolicy(createPolicyDto: TrackingPolicyDTO): Promise<Policy> {
      const { organizationId, policyName, screenshotInterval, teamId } = createPolicyDto;
      console.log(organizationId, policyName, screenshotInterval, teamId);
      const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }
   
      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }
      console.log(team);
      const policy = this.policyRepository.create({
        policyName,
        screenshotInterval,
        // isDefault,
        organization,
        assignedTeams: [team],
        // policyContent,
      });
  
      await this.policyRepository.save(policy);
      return policy;
    }
  
    // Update a policy
    async updatePolicy(id: string, updatePolicyDto: TrackingPolicyDTO): Promise<Policy> {
      const policy = await this.policyRepository.findOne({ where: { policyId: id } });
      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }
  
      const { policyName, screenshotInterval } = updatePolicyDto;
      
      policy.policyName = policyName ?? policy.policyName;
      policy.screenshotInterval = screenshotInterval ?? policy.screenshotInterval;
      // policy.isDefault = isDefault ?? policy.isDefault;
      // policy.policyContent = policyContent ?? policy.policyContent;
  
      await this.policyRepository.save(policy);
      return policy;
    }
  
    // Fetch all policies for an organization
    async getPoliciesForOrganization(organizationId: string): Promise<Policy[]> {
      const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }
  
      return await this.policyRepository.find({
        where: { organization: organization },
        relations: ['assignedTeams', 'assignedUsers'],
      });
    }
  
    // Fetch a single policy
    async getPolicyById(policyId: string): Promise<Policy> {
      const policy = await this.policyRepository.findOne({
        where: { policyId },
        relations: ['assignedTeams', 'assignedUsers'],
      });
  
      if (!policy) {
        throw new NotFoundException(`Policy with ID ${policyId} not found`);
      }
  
      return policy;
    }

    async finalResponseData(userConfig:TrackTimeStatus,device:string,organizationId:string){
      let isPaidStatus = await this.SubscriptionRepository.findOne({where: {organization_id:organizationId}})
      if(!isPaidStatus?.organization_id){
        return false;
      }
      return true;
    }
}
