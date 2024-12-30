
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
import { Between, IsNull, Not, Repository } from 'typeorm';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { CreateTeamDTO } from './dto/teams.dto';
import { UserActivity } from 'src/users/user_activity.entity';
import { DeepPartial } from 'typeorm';
import { prototype } from 'events';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { AccessAnalyzer, S3 } from 'aws-sdk';
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
import { PolicyTeams } from './policy_team.entity';
import { PolicyUsers } from './policy_user.entity';
import { ScreenshotSettings } from './screenshot_settings.entity';
import { TrackingHolidays } from './tracking_holidays.entity';
import { TrackingWeekdays } from './tracking_weekdays.entity';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { organizationAdminService } from './OrganizationAdmin.service';
import { ProductivitySettingEntity } from './prodsetting.entity';

export const holidayList = [
  // Indian Holidays
  { dayName: 'Republic Day', date: new Date('2024-01-26') },
  { dayName: 'Independence Day', date: new Date('2024-08-15') },
  { dayName: 'Gandhi Jayanti', date: new Date('2024-10-02') },
  { dayName: 'Holi', date: new Date('2024-03-25') },
  { dayName: 'Diwali', date: new Date('2024-11-12') },
  { dayName: 'Eid al-Fitr', date: new Date('2024-04-10') },
  { dayName: 'Christmas', date: new Date('2024-12-25') },
  { dayName: 'Good Friday', date: new Date('2024-03-29') },
  { dayName: 'Dussehra', date: new Date('2024-10-15') },
  { dayName: 'Janmashtami', date: new Date('2024-08-22') },
  { dayName: 'Mahatma Gandhi Jayanti', date: new Date('2024-10-02') },

  // Global Holidays
  { dayName: "New Year's Day", date: new Date('2024-01-01') },
  { dayName: "International Women's Day", date: new Date('2024-03-08') },
  { dayName: 'Labor Day', date: new Date('2024-05-01') },
  { dayName: 'Halloween', date: new Date('2024-10-31') },
  { dayName: 'Thanksgiving', date: new Date('2024-11-28') },
  { dayName: 'Veterans Day', date: new Date('2024-11-11') },
  { dayName: 'Easter Sunday', date: new Date('2024-03-31') },
  { dayName: "Mother's Day", date: new Date('2024-05-12') },
  { dayName: "Father's Day", date: new Date('2024-06-16') },
  { dayName: "Valentine's Day", date: new Date('2024-02-14') },
];
const weekdayData = [
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130002',
    day_name: 'Monday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130003',
    day_name: 'Tuesday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130004',
    day_name: 'Wednesday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130005',
    day_name: 'Thursday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130006',
    day_name: 'Friday',
    day_status: true,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130007',
    day_name: 'Saturday',
    day_status: true,
    checkIn: 1000,
    checkOut: 1600,
    break_start: 1330,
    break_end: 1430,
  },
  {
    day_uuid: '1c7421c2-26f7-11ec-9621-0242ac130008',
    day_name: 'Sunday',
    day_status: false,
    checkIn: 930,
    checkOut: 1800,
    break_start: 1330,
    break_end: 1430,
  },
];

// You can then save this `weekdayData` into the database using your existing repository methods.

// You can then save this `weekdayData` into the database using your existing repository methods.

export const LocalFlaskBaseApi =
  'https://python-link-classification-u2xx.onrender.com';

// export const LocalFlaskBaseApi = 'http://127.0.0.1:5000';
type UpdateConfigType = DeepPartial<User['config']>;

@Injectable()
export class OnboardingService {
  private s3: S3;
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-06-28`; // Flask API URL
  // private flaskApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity?date=2024-07-14`; // Flask API URL
  private flaskBaseApiUrl = `${LocalFlaskBaseApi}/calculate_hourly_productivity`;
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
    @InjectRepository(PolicyUsers)
    private PolicyUserRepository: Repository<PolicyUsers>,
    @InjectRepository(PolicyTeams)
    private PolicyTeamRepository: Repository<PolicyTeams>,
    @InjectRepository(ScreenshotSettings) 
    private ScreenshotSetRepository: Repository<ScreenshotSettings>,
    @InjectRepository(TrackingHolidays)
    private TrackHolidaysRepository: Repository<TrackingHolidays>,
    @InjectRepository(TrackingWeekdays)
    private TrackWeedaysRepository: Repository<TrackingWeekdays>,
    @InjectRepository(ProductivitySettingEntity)
    private TrackProdSettingsRepository: Repository<ProductivitySettingEntity>,
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
  async getOrganizationDetails(id: string): Promise<Organization> {
    console.log('id', id);
    if (id) {
      let organization = await this.organizationRepository.findOne({
        where: { id },
      });
      console.log('organization', organization);
      return organization;
    }
    return null;
  }

  async createCalculatedLogicForNewOrganization(organizationId:string):Promise<boolean>{
    if(!organizationId){
      return false;
    }
    const calculatedLogic = this.calculatedLogicRepository.create({
      organization_id: organizationId,
      full_day_active_time: 8,
      full_day_core_productive_time: 4,
      half_day_active_time: 4,
      half_day_core_productive_time: 2,
    });
    await this.calculatedLogicRepository.save(calculatedLogic);

    return true;

  }


  async getLastestActivity(organid: string): Promise<{ [key: string]: string }> {
    try {
      // Fetch all user activities for the organization
      const userActivities = await this.userActivityRepository.find({
        where: { organization_id: organid },
      });

      // Map latest activity for each user
      const userLatestActivities = userActivities.reduce((acc, activity) => {
        const userId = activity.user_uid;
        const activityTimestamp = new Date(activity.timestamp).getTime();

        // Only update if no entry exists or the current activity is newer
        if (!acc[userId] || new Date(acc[userId].timestamp).getTime() < activityTimestamp) {
          acc[userId] = activity;
        }

        return acc;
      }, {} as { [key: string]: UserActivity });

      // Map to userId -> lastActive (human-readable time difference)
      const now = Date.now();
      const result = Object.keys(userLatestActivities).reduce((acc, userId) => {
        const lastActivityTime = new Date(userLatestActivities[userId].timestamp).getTime();
        acc[userId] = this.getTimeAgo(now - lastActivityTime); // Human-readable time
        return acc;
      }, {} as { [key: string]: string });

      console.log('User Latest Activity:', result);
      return result;
    } catch (error) {
      console.error('Error fetching latest activity:', error);
      throw new Error('Failed to fetch latest activity');
    }
  }

  private getTimeAgo(diffInMs: number): string {
    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  async getAppUsageStatics(organizationId: string, userId: string): Promise<any> {
    try {
      const userActivities = await this.userActivityRepository.find({
        where: { organization_id: organizationId, user_uid: userId },
      });
  
      // Count the active time for each app
      const totalActiveTime: Record<string, number> = {};
      userActivities.forEach((activity) => {
        if (activity?.app_name) {
          if (totalActiveTime[activity.app_name]) {
            totalActiveTime[activity.app_name]++;
          } else {
            totalActiveTime[activity.app_name] = 1;
          }
        }
      });
  
      // Calculate percentages and transform the format
      const formattedData = this.calculatePercentages(totalActiveTime);
  
      return formattedData;
  
    } catch (error) {
      console.log("Error fetching app usage statics", error);
      throw new Error("Failed to fetch app usage statics");
    }
  }
  
  private calculatePercentages = (usageData: Record<string, number>): { name: string; percent: number }[] => {
    const totalUsage = Object.values(usageData).reduce((sum, count) => sum + count, 0);
    const percentages: { name: string; percent: number }[] = [];
  
    for (const [appName, usageCount] of Object.entries(usageData)) {
      percentages.push({
        name: appName,
        percent: Math.round((usageCount / totalUsage) * 100),
      });
    }
  
    return percentages;
  };
  
  
  async getDeskTopName(organization:string):Promise<string> {
    const appName = await this.desktopAppRepository.findOne({where:{organizationId:organization}});
    console.log(appName);
    return appName.name || "trackTime"
  }
  async updateOrganization(
    Organization: Organization,
    data: CreateOrganizationDTO,
  ): Promise<string> {
    console.log(data);
    try {
      const orga = await this.organizationRepository.findOne({
        where: { id: Organization?.id },
      });
      if (orga?.id) {
        data?.country && (orga.country = data.country);
        data?.timeZone && (orga.timeZone = data.timeZone);
        data?.name && (orga.name = data.name);
        data?.logo && (orga.logo = data.logo);
        await this.organizationRepository.save(orga);
        return orga.id;
      }
      return null;
    } catch (error) {
      console.log({ error: error.message });
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

  async getAllusers(organId:string):Promise<User[]> {
    const users = await this.userRepository.find({where:{organizationId:organId}});
    return users;
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
    // if(isOrganization) {
    //   // isOrganization = await this.organizationAdminService.findOrganization(isOrganization.id)
    //   // return isOrganization.id;
    // }


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

    console.log('devices: ' , devices.length);
    if (!devices?.length) {
      return null;
    }
    console.log('devicesInfo: ' + deviceInfo.length);

    devices = devices.map((item) => {
      // console.log('device: ' + item);
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
      where: { user_uid: id,organization_id:organId },
    });
    // console.log('fetched data', FetchedData);
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
    // console.log(page, limit, skip, take);
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
    // console.log("userData",userData);
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
      config:{trackTimeStatus:TrackTimeStatus.Resume},
    });

    // Save the new device to the database
    await this.devicesRepository.save(deviceForUser); // Make sure to save the new device
    console.log('deviceForUser', deviceForUser);

    console.log('Created device:', deviceForUser.device_uid);
    return deviceForUser.device_uid;
  }

  async getUserDeviceId(deviceId: string) {
    try {
      const device = await this.devicesRepository.findOne({
        where: { device_uid: deviceId },
      });
      const organizationDetails = await this.organizationRepository.findOne({
        where:{id:device.organization_uid}
      })
      const users = await this.userRepository.findOne({where:{userUUID:device?.user_uid},relations:["team"]});
       
      console.log("users_team", users.team);
      device["organizationDetails"] = organizationDetails;
      device["organizationTeam"] = users.team;
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
      this.logger.error(
        `Error checking device ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserConfig(deviceId: string, organizationId: string): Promise<any> {
    try {
      // Log the input parameters for debugging
      this.logger.debug(
        `Fetching user config for device: ${deviceId}, organization: ${organizationId}`,
      );

      // Validate that deviceId and organizationId are not null or empty
      if (!deviceId || !organizationId) {
        this.logger.error(
          `Invalid input: deviceId or organizationId is missing.`,
        );
        throw new Error(
          'Invalid input: deviceId or organizationId is missing.',
        );
      }

      // Fetch the user config from the database
      let userConfig = await this.devicesRepository.findOne({
        where: { device_uid: deviceId}
      });
      this.logger.log(
        `device_config: ${userConfig}`
      )
      if (!userConfig) {
        this.logger.warn(
          `User config not found for device ${deviceId} and organization ${organizationId}`,
        );
        // throw new Error(
        //   `User config not found for device ${deviceId} and organization ${organizationId}`,
        // );
      }

      // Check if the config is null and update it with default value if necessary
      if (!userConfig.config) {
        this.logger.log(
          `User config is null. Setting default config: { trackTimeStatus: 'Resume' } for device: ${deviceId}`,
        );

        // Update the config field
        userConfig.config = { trackTimeStatus: TrackTimeStatus.Resume };

        // Save the updated user config back to the database
        await this.devicesRepository.save(userConfig);

        this.logger.log(
          `Default config set successfully for device: ${deviceId}`,
        );
      }

      this.logger.debug(
        `User config fetched successfully: ${JSON.stringify(userConfig)}`,
      );
      return userConfig;
    } catch (error) {
      // Log the error with details to identify the cause
      this.logger.error(
        `Failed to fetch or update user config: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to fetch or update user config: ${error.message}`,
      );
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

  async getWeeklyAttendance(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AttendanceDto[]> {
    const calculatedLogic = await this.calculatedLogicRepository.findOne({
      where: { organization_id: organizationId },
    });
    console.log('calculatedLogic', calculatedLogic);
    if (!calculatedLogic) {
      throw new NotFoundException(
        'CalculatedLogic not found for the organization',
      );
    }
    console.log(organizationId);
    const devices = await this.devicesRepository.find({
      where: { organization_uid: organizationId },
    });
    console.log('devices', devices);
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
          user_uid: device.device_uid,
        },
        order: { timestamp: 'ASC' },
      });
      console.log('userActivities', userActivities);

      const recordsOfWeek: any[] = [];

      const days = this.getDateRange(fromDate, toDate);
      for (const day of days) {
        const activitiesOfDay = userActivities.filter(
          (activity) =>
            activity.timestamp >= day.start && activity.timestamp <= day.end,
        );

        let status = 'absent';
        console.log(activitiesOfDay.length);
        // activitiesOfDay.length && activitiesOfDay.forEach(activity =>{
        //   console.log("Name: ",activity.device_user_name,activity.page_title);
        // });
        if (activitiesOfDay.length > 0) {
          const firstActivity = activitiesOfDay[0];
          const lastActivity = activitiesOfDay[activitiesOfDay.length - 1];
          const workDuration =
            (lastActivity.timestamp.getTime() -
              firstActivity.timestamp.getTime()) /
            (1000 * 60 * 60);

          console.log('workDuration: ' + workDuration);
          console.log(
            'fullDayActiveTime for the organization: ' +
              calculatedLogic?.full_day_active_time,
          );
          console.log(
            'HalfDayActiveTime for the organization:: ' +
              calculatedLogic?.half_day_active_time,
          );

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
        holiday: recordsOfWeek.filter(
          (record) => record.DateStatus === 'holiday',
        ).length,
        recordsofWeek: recordsOfWeek,
      };

      attendanceData.push(attendanceDto);
    }

    return attendanceData;
  }

  private getDateRange(
    startDate: Date,
    endDate: Date,
  ): { start: Date; end: Date }[] {
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

  async createCalculatedLogic(
    data: Partial<CreateCalculatedLogicDto>,
    organizationId: string,
  ): Promise<CalculatedLogic> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    console.log('organization', organization);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const isExistCalculatedLogic = await this.calculatedLogicRepository.findOne(
      { where: { organization_id: organizationId } },
    );
    console.log('isExistCalculatedLogic', isExistCalculatedLogic);
    if (!isExistCalculatedLogic?.id) {
      console.log('data', data);
      const calculatedLogic = this.calculatedLogicRepository.create({
        organization_id: organization?.id,
        full_day_active_time: data.fullDayActiveTime,
        full_day_core_productive_time: data.fullDayCoreProductiveTime,
        half_day_active_time: data.halfDayActiveTime,
        half_day_core_productive_time: data.halfDayCoreProductiveTime,
      });
      return this.calculatedLogicRepository.save(calculatedLogic);
    }
    console.log(data);
    if (data.fullDayCoreProductiveTime && data.halfDayActiveTime) {
      isExistCalculatedLogic.full_day_active_time = data.fullDayActiveTime;
      isExistCalculatedLogic.full_day_core_productive_time =
        data.fullDayCoreProductiveTime;
      isExistCalculatedLogic.half_day_active_time = data.halfDayActiveTime;
      isExistCalculatedLogic.half_day_core_productive_time =
        data.halfDayCoreProductiveTime;
    }

    return this.calculatedLogicRepository.save(isExistCalculatedLogic);
  }

  async getCalculatedLogicByOrganization(
    organizationId: string,
  ): Promise<CalculatedLogic> {
    return this.calculatedLogicRepository.findOne({
      where: { organization_id: organizationId },
    });
  }

  async createPolicy(createPolicyDto: TrackingPolicyDTO): Promise<Policy> {
    const { organizationId, policyName, screenshotInterval, teamId } = createPolicyDto;
  
    try {
      // Step 1: Validate and fetch related entities
      const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }
  
      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }
  
      const users = await this.userRepository.find({ where: { teamId: team.id } });
      // if (users.length === 0) {
      //   throw new NotFoundException(`No users found for team ID ${teamId}`);
      // }
  
      // Step 2: Create the policy
      const policy = this.policyRepository.create({
        policyName,
        screenshotInterval,
        organization,
      });
      await this.policyRepository.save(policy);
  
      // Step 3: Assign team and users to the policy
      const teamCreate = this.PolicyTeamRepository.create({
        policy:policy,
        team:team,
      })
      await this.PolicyTeamRepository.save(teamCreate);
      
      if(users?.length){
        const policyUsers = users?.map((user) => ({
          policy,
          user,
        }));
        await this.PolicyUserRepository.save(policyUsers);
      }
  
      // Step 4: Create related settings
      const screenShotsSettings = this.ScreenshotSetRepository.create({
        policy,
        blurScreenshotsStatus:false,
        monitoringStatus:true,
        organization_id:policy?.organization?.id,
        time_interval:2
      }
      )
      await this.ScreenshotSetRepository.save(screenShotsSettings);
  
      const holidays = holidayList.map((holiday) => ({
          holiday_date:holiday?.date,
          holiday_name: holiday.dayName,
          day_status: true,
          holidayDate: holiday.date,
          policy
        }))
      await this.TrackHolidaysRepository.save(holidays);
  
      const weekdays = weekdayData.map((day) => ({
        policy,
        day_uuid: day.day_uuid,
        day_name: day.day_name,
        day_status: day.day_status,
        checkIn: this.convertTimeToMinutes(day.checkIn),
        checkOut: this.convertTimeToMinutes(day.checkOut),
        break_start: this.convertTimeToMinutes(day.break_start),
        break_end: this.convertTimeToMinutes(day.break_end),
      }));
      await this.TrackWeedaysRepository.save(weekdays);
  
      // Step 5: Return the complete policy with relations
      return await this.policyRepository.findOne({
        where: { policyId: policy?.policyId },
        relations: [
          'assignedTeams',
          'assignedUsers',
          'ScreenshotSettings',
          'holidays',
          'weekdays',
        ],
      }); 
    } catch (error) {
      // Handle any errors
      throw new BadRequestException(`Failed to create policy: ${error.message}`);
    }
  }
  

  convertTimeToMinutes(time: number): number {
    const hours = Math.floor(time / 100); // Extract hours (HH part)
    const minutes = time % 100; // Extract minutes (MM part)
    return hours * 60 + minutes; // Convert to total minutes
  }

  async getDetailsForPolicy(policies: Policy[]) {
    if (!policies.length) {
      return policies;
    }
  
    const updatedPolicies = await Promise.all(
      policies.map(async (pol) => {
        pol['team'] = 0;
        pol['user'] = 0;
        pol['trackedHolidays'] = holidayList.length || 8;
        pol['trackedWeekdays'] = weekdayData.length || 7;
        pol['productivityItems'] = '46';
        pol['screenshotInterval'] = 1;
  
        // Get team and user count for each policy
        const team = await this.PolicyTeamRepository.find({
          where: {
            policy: { policyId: pol?.policyId },
            team: Not(IsNull()), // Only include records where the team is not null
          },
          relations: ['team'],
        });
        // console.log(team)
        const user = await this.PolicyUserRepository.find({
          where: {
            policy:{policyId:pol.policyId},
            user: Not(IsNull()), // Only include records where the user is not null
          },
          relations: ['user'], // Ensure user details are loaded
        });
  
        const screenshotTiming = await this.ScreenshotSetRepository.findOne({
          where: { policy: { policyId: pol?.policyId } },
        });
  
        const trackWeekDays = await this.TrackWeedaysRepository.find({
          where: { policy: { policyId: pol?.policyId } },
        });
  
        const trackHoliDays = await this.TrackHolidaysRepository.find({
          where: { policy: { policyId: pol?.policyId } },
        });
  
        console.log('team', team);
        console.log('trackWeekdays', trackWeekDays?.length);
        console.log('trackHolidays', trackHoliDays?.length);
        console.log('teamLength', team?.length);
        console.log('userLength', user?.length);
        console.log('screenshotInterval', screenshotTiming?.time_interval);
  
        // Update the policy object with the fetched data
        pol['team'] = team?.length;
        pol['user'] = user?.length;
        pol['trackedHolidays'] = trackHoliDays?.length;
        pol['trackedWeekdays'] = trackWeekDays?.length;
        pol['screenshotInterval'] = screenshotTiming?.time_interval || 1;
  
        return pol;
      }),
    );
  
    return updatedPolicies;
  }
  

  // Update a policy
  async updatePolicy(
    id: string,
    updatePolicyDto: TrackingPolicyDTO,
  ): Promise<Policy> {
    const policy = await this.policyRepository.findOne({
      where: { policyId: id },
    });
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
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    console.log(organization);
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    return await this.policyRepository.find({
      where: { organization: { id: organization?.id } },
      // relations: ['assignedTeams', 'assignedUsers'],
    });
  }

  // Fetch a single policy
  async getPolicyById(policyId: string){
    const policy = await this.policyRepository.findOne({
      where: { policyId },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }
    // policy['team'] = 0;
    // pol['user'] = 0;
    policy['trackedHolidays'] = [];
    policy['trackedWeekdays'] = [];
    policy['productivityItems'] = '46';
    policy['screenshotInterval'] = 1;
    policy['ScreenshotSettings'] = null;
    policy['assignedUsers'] = [];
    policy['assignedTeams'] = [];

    // Get team and user  count for each policy
    // const team = await this.PolicyTeamRepository.findOne({ where: { policy: { policyId: pol?.policyId } } });
    // const user = await this.PolicyUserRepository.findOne({ where: { policy: { policyId: pol?.policyId } } });
    const screenshotTiming = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policy?.policyId } },
    });
    const trackWeekDays = await this.TrackWeedaysRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });

    const trackHoliDays = await this.TrackHolidaysRepository.find({
      where: { policy: { policyId: policy?.policyId } },
    });


    const assingUser = await this.PolicyUserRepository.find({where:{policy:{policyId:policy?.policyId}}});
    const assignTeam = await this.PolicyTeamRepository.find({where:{policy:{policyId:policy?.policyId}}});

    // const ScreenShotSettings = await this.ScreenshotSetRepository.findOne({where:{policy:{policyId:policy?.policyId}}})
    // console.log(ScreenShotSettings)
    console.log(trackWeekDays?.length);
    console.log(trackHoliDays?.length);
    // Update the policy object with the fetched data
    // policy['team'] = team.length;
    // pol['user'] = user.length;
    policy['trackedHolidays'] = trackHoliDays;
    policy['ScreenshotSettings'] = screenshotTiming;
    policy['trackedWeekdays'] = trackWeekDays;
    policy['screenshotInterval'] = screenshotTiming?.time_interval || 2;
    policy['assignedTeams'] = assignTeam;
    policy['assignedUsers'] = assingUser;

    return policy;
  }
 async getPolicyTeamAndUser(policyId: string): Promise<Policy>{
  console.log("Policy_id",policyId);
  const policy = await this.policyRepository.findOne({
    where: { policyId },
    relations: [
      'assignedTeams',          // Loads PolicyTeams entities
      'assignedTeams.team',     // Loads Team data within each PolicyTeam
      'assignedUsers',          // Loads PolicyUsers entities
      'assignedUsers.user'      // Loads User data within each PolicyUser
    ],
  });
  console.log("Policy",policy);

  // let policyTeam = await this.PolicyTeamRepository.find({
  //   where:{policy:{policyId:policy?.policyId},
  // }});
  // const user = await this.PolicyUserRepository.find({where:{policy:{policyId:policy?.policyId}}});
   
  // policy["assignedUsers"] = user;
  // console.log(user)
  // policy["assignedUsers"] = user;
  // policy["assignedTeams"] = policyTeam;
  return policy;
 }

 async getUserPolicyData(organId:string,userId:string):Promise<Policy[]>{
  // let policy = await this.policyRepository.find({where:{organization:{id:organId}}});
  console.log(organId,userId);
  let policyUsersList = await this.policyRepository.find({where:{organization:{id:organId}},relations:["assignedUsers"]})
  console.log("policyUsersList",policyUsersList)
  return policyUsersList;
  // return policyUsersList; 
 }
  async finalResponseData(
    userConfig: TrackTimeStatus,
    device: string,
    organizationId: string,
  ) {
    let isPaidStatus = await this.SubscriptionRepository.findOne({
      where: { organization_id: organizationId },
    });
    if (!isPaidStatus?.organization_id) {
      return false;
    }
    return true;
  }

  async duplicatePolicy(
    policyId: string,
    name: string,
    teamId: string,
  ): Promise<Policy> {
    console.log(policyId);
    const policyExist = await this.policyRepository.findOne({
      where: { policyId: policyId },
    });
    if (!policyExist) {
      return null;
    }
    console.log('policyExist', policyExist);
    const team = await this.PolicyTeamRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });

    console.log(team);
    const teamExist = team?.length ? team?.find((te) => te.id === teamId) : '';

    const newTeam = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (teamId && newTeam && !teamExist) {
      // team = [...team, newTeam];
      const createPolicyTeam = this.PolicyTeamRepository.create({
        policy: { policyId: policyExist?.policyId },
        team: newTeam,
      });
      await this.PolicyTeamRepository.save(createPolicyTeam);
    }
    const weekdays = await this.TrackWeedaysRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const holiday = await this.TrackHolidaysRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const screenshot_settings = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyExist?.policyId } },
    });
    const policy_users = await this.PolicyUserRepository.find({
      where: { policy: { policyId: policyExist?.policyId } },
    });

    console.log(weekdays, policy_users);

    const newPolicyName = `${policyExist?.policyName}(copy)`;

    const newPolicy = this.policyRepository.create({
      policyName: name || newPolicyName,
      assignedTeams: team,
      assignedUsers: policy_users,
      organization: policyExist.organization,
      screenshotInterval: screenshot_settings.time_interval,
      weekdays: weekdays,
      holidays: holiday,
      ScreenshotSettings: screenshot_settings,
    });

    await this.policyRepository.save(newPolicy);
    console.log(newPolicy);
    return newPolicy;
  }
  async updatePolicyUserAndTeam(
    policyId:string,
    teamId:string,
    userId:string,
  ){
    const isPolicyExist = await this.policyRepository.findOne({where:{policyId:policyId}});
    if(!isPolicyExist) {
      throw new NotFoundException(`policy doesn't exist for  policy ${policyId}.`);
    }
    const isteamExist = await this.teamRepository.findOne({where:{id:teamId}});
    if(!isteamExist ) {
      throw new NotFoundException(`team does't exist for  policy ${policyId}.`);
    }
    const isUserExist = await this.userRepository.findOne({where:{userUUID:userId}});
    if( userId && !isUserExist ) {
      throw new NotFoundException(`User doesn't exist for  policy ${policyId}.`);
    }
    
    const teamInPolicyExist = await this.PolicyTeamRepository.findOne({where:{team:{id:isteamExist?.id}},
    relations:["team"]
    });
    console.log("teamInPolicyExist",teamInPolicyExist);
    
    if(teamInPolicyExist && teamInPolicyExist?.team){
      return isPolicyExist;
    }
    
    const team = this.PolicyTeamRepository.create({
      policy:{policyId:isPolicyExist?.policyId},
      team:{id:isteamExist?.id}
    })

    await this.PolicyTeamRepository.save(team);
    
    const userInPolicyiExist = await this.PolicyUserRepository.findOne({where:{user:{userUUID:isUserExist?.userUUID}},
    relations:["user"]
    });
    
    console.log("userInPolicyiExist",userInPolicyiExist);

    
    if(userInPolicyiExist && userInPolicyiExist?.user){
      return isPolicyExist;
    }
    const user = this.PolicyUserRepository.create({
      policy:{policyId:isPolicyExist?.policyId},
      user:{userUUID:isUserExist?.userUUID}
    })
    
    await this.PolicyUserRepository.save(user);
    return isPolicyExist;
  }
  async updateScreenShotSettings(
    policyId:string,
    screenshot_id:string,
    blurScreenshotsStatus :boolean,
    time_interval:number,
    screenshot_monitoring:boolean
  ):Promise<ScreenshotSettings>{
    const policy = await this.policyRepository.findOne({where:{policyId:policyId},
    relations:[
      "ScreenshotSettings",
    ]});
    console.log(policy)
    if(!policy?.policyId){
      throw new NotFoundException(`Policy with ID ${policyId} not found.`);
    }
    // const screenshotSeetings = await this.ScreenshotSetRepository.findOne({where:{policy:{policyId:policy?.policyId}},relations:["policy"]});
    const screenshotSeetings = await this.ScreenshotSetRepository.findOne({where:{organization_id:policy?.organization?.id},relations:["policy"]});
    // let newScreenshotSetings = await  
    screenshotSeetings.blurScreenshotsStatus = blurScreenshotsStatus,
    screenshotSeetings.time_interval = time_interval,
    screenshotSeetings.monitoringStatus = screenshot_monitoring,
     
    await this.ScreenshotSetRepository.save(screenshotSeetings);
    
    console.log("screenshotSeetings",screenshotSeetings);
    console.log("policy",policy);

    return screenshotSeetings;
  } 
  async deletePolicy(policyId: string) {
    // Step 1: Find the policy to ensure it exists
    const policy = await this.policyRepository.findOne({ where: { policyId } });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found.`);
    }
    this.logger.log("policy name: " + policy?.policyName)
    // Deleting ScreenshotSettings related to the policy
    await this.ScreenshotSetRepository.delete({ policy: { policyId } });

    // Deleting Tracked Weekdays related to the policy 
    await this.TrackWeedaysRepository.delete({ policy: { policyId } });

    // Deleting Tracked Holidays related to the policy
    await this.TrackHolidaysRepository.delete({ policy: { policyId } });

    // Deleting PolicyUsers (if applicable)
    await this.PolicyUserRepository.delete({ policy: { policyId } });

    // Deleting PolicyTeams (if applicable)
    await this.PolicyTeamRepository.delete({ policy: { policyId } });

    // Step 3: Finally delete the policy itself
    await this.policyRepository.delete({ policyId });
  }

  async findTimeForPaidUsers(deviceId: string): Promise<number> {
    // Find the user associated with the device
    const userDevice = await this.devicesRepository.findOne({
      where: { device_uid: deviceId }
    });

    if (!userDevice) {
      // If no user is found, return the default interval (e.g., 2)
      return 2;
    }

    // Find the PolicyUser relation that includes the policy
    const policyUser = await this.PolicyUserRepository.findOne({
      where: { user: { userUUID: userDevice?.user_uid } },
      relations: ['policy'], // Load the policy relation
    });

    if (!policyUser || !policyUser.policy) {
      // If no policy is found, return the default interval (e.g., 2)
      return 2;
    }

    // Fetch the policy details, specifically the screenshot interval
    const screenshotInterval = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyUser?.policy?.policyId } },
    });

    // Return the screenshot interval if found; otherwise, default to 2
    return screenshotInterval?.time_interval || 2;
  }
  async findBlurScreenshotStatus(deviceId: string): Promise<boolean>{
    const userDevice = await this.devicesRepository.findOne({
      where: { device_uid: deviceId }
    });
    console.log("device",userDevice)
    if (!userDevice) {
      // If no user is found, return the default interval (e.g., 2)
      return false;
    }

    // Find the PolicyUser relation that includes the policy
    const policyUser = await this.PolicyUserRepository.findOne({
      where: { user: { userUUID: userDevice?.user_uid } },
      relations: ['policy'], // Load the policy relation
    });
    console.log("policyUser",policyUser)

    if (!policyUser || !policyUser.policy) {
      // If no policy is found, return the default interval (e.g., 2)
      return false;
    }

    // Fetch the policy details, specifically the screenshot interval
    const screenshotInterval = await this.ScreenshotSetRepository.findOne({
      where: { policy: { policyId: policyUser?.policy?.policyId } },
    });
    console.log("Screenshot",screenshotInterval)

    return screenshotInterval?.blurScreenshotsStatus || false;
  }

}
  