import { CreateDevicesDto } from './dto/devices.dto';
import { TrackingPolicyDTO } from './dto/tracingpolicy.dto';
import { CreateProductivitySettingDTO } from './dto/prodsetting.dto';
import { applicationDTO } from './dto/applications.dto';
import { DesktopAppDTO } from './dto/desktopapp.dto';
import { CreateUniqueAppsDto } from './dto/uniqueapps.dto';
import { CreateCategoryDto } from './dto/category.dto';
import { EmailReportSettingDto } from './dto/emailreportsetting.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { registeredUsersDto } from './dto/registeredusers.dto';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamMember } from './teammembers.entity';
import { Repository } from 'typeorm';
import { CreateTeamDTO } from './dto/teams.dto';
import { CreateTeamMembersDto } from './dto/teammembers.dto';
import { UUID } from 'crypto';
import { UpdateUserDto } from './dto/UpdateUserDto.dto';
import { CreateOrganizationDto } from './dto/organizations.dto';
import { updateOrgDto } from './dto/updateorg.dto';
import { Subscription } from './subscription.entity';
import { EmailReportSettings } from './emailreportsetting.entity';
import { Category } from './category.entity';
import { UniqueApps } from './uniqueapps.entity';
import { v4 as uuidv4 } from 'uuid';
import { DesktopAppEntity } from './desktopapp.entity';
import { applcationEntity } from './application.entity';
import { ProductivitySettingEntity } from './prodsetting.entity';
import { Policy } from './trackingpolicy.entity';
import { Devices } from './devices.entity';
import { Organization } from './organisation.entity';
import { Team } from './team.entity';
import { User } from 'src/users/user.entity';
import { CreateUserDTO } from './dto/users.dto';
@Injectable()
export class teamAndTeamMemberService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private registeredUserRepository: Repository<User>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(Subscription)
    private subsRepository: Repository<Subscription>,
    @InjectRepository(EmailReportSettings)
    private emailreportRepository: Repository<EmailReportSettings>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(UniqueApps)
    private UniqueAppsRepository: Repository<UniqueApps>,
    @InjectRepository(DesktopAppEntity)
    private desktopAppsRepository: Repository<DesktopAppEntity>,
    @InjectRepository(applcationEntity)
    private appRepository: Repository<applcationEntity>,
    @InjectRepository(ProductivitySettingEntity)
    private prodRepository: Repository<ProductivitySettingEntity>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(Devices)
    private deviceRepository: Repository<Devices>,
  ) {}
  //create team
  // async createTeam(createTeamsDto: CreateTeamMembersDto): Promise<Teams> {
  //   const team = this.teamRepository.create({
  //     team_uuid: uuidv4(),
  //     organization_id: createTeamsDto.organization_id,
  //     policy_uuid: createTeamsDto.policy_uuid,
  //     name: createTeamsDto.team_name,
  //     status:false,
  //   });

  //   const savedTeam = await this.teamRepository.save(team);
  //   console.log('Saved Team:', savedTeam);
  //   return savedTeam;
  // }
  //get team
  async getTeam(): Promise<Team[]> {
    return this.teamRepository.find();
  }
  // async updateById(team_uuid: UUID, dto: CreateTeamDTO) {
  //   await this.teamRepository.update(team_uuid, dto);
  //   return this.teamRepository.findOne({ where: { team_uuid } });
  // }
  async deleteById(team_uuid: UUID) {
    this.teamMemberRepository.delete({ team_uuid });
    return await this.teamRepository.delete({  });
  }
  async getTeamDetailsByTeamId(team_uuid: string): Promise<Team[]> {
    console.log(`getTeamDetails called with team_uuid: ${team_uuid}`);
    try {
      const teams = await this.teamRepository
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.teamMembers', 'teammember')
        .where('team.team_uuid = :team_uuid', { team_uuid })
        .getMany();

      console.log(`Found teams for team_uuid ${team_uuid}:`, teams); // Log the result
      return teams; // This will return teams with their team members
    } catch (error) {
      console.error(
        'Error fetching team details for team_uuid:',
        team_uuid,
        error,
      );
      throw new InternalServerErrorException('Error fetching team details');
    }
  }

  async addTeamMembers(
    CreateTeamMembersDto: CreateTeamMembersDto,
  ): Promise<TeamMember> {
    const team = this.teamMemberRepository.create({
      member_uuid: uuidv4(),
      team_uuid: CreateTeamMembersDto.team_uuid,
      team_name: CreateTeamMembersDto.team_name,
      user_uuid: CreateTeamMembersDto.user_uuid,
      organization_id: CreateTeamMembersDto.organization_id,
      user_name: CreateTeamMembersDto.user_name,
      device_id: CreateTeamMembersDto.device_id,
      user_role: CreateTeamMembersDto.user_role,
      policy_uuid: CreateTeamMembersDto.policy_uuid,
    });

    const savedTeamMembers = await this.teamMemberRepository.save(team);
    console.log('Saved Team Members:', savedTeamMembers);
    return savedTeamMembers;
  }
  async getTeamMembers(): Promise<TeamMember[]> {
    return this.teamMemberRepository.find();
  }
  async updateTeamMembersById(member_uuid: UUID, dto: CreateTeamMembersDto) {
    await this.teamMemberRepository.update(member_uuid, dto);
    return this.teamMemberRepository.findOne({ where: { member_uuid } });
  }
  async deleteTeamMembersById(member_uuid: UUID) {
    return await this.teamMemberRepository.delete({ member_uuid });
  }
  //users
  async registerUser(
    registeredUsersDto: CreateUserDTO,
  ): Promise<User> {
    const user = this.registeredUserRepository.create({
      // user_uid: uuidv4(),
      // organization_id: registeredUsersDto.organization_id,
      // first_name: registeredUsersDto.first_name,
      // last_name: registeredUsersDto.last_name,
      // organization_name: registeredUsersDto.organization_name,
      // team_id: registeredUsersDto.team_id,
      // type: registeredUsersDto.type,
      // account_status: registeredUsersDto.account_status,
      
    });
    const organization_id = registeredUsersDto.organizationId;
    const organization_name = registeredUsersDto.organizationId;

    const org = this.orgRepository.create({
      id: organization_id,
      name: organization_name,
    });
    const savedUser = await this.registeredUserRepository.save(user);
    const savedOrg = await this.orgRepository.save(org);
    console.log('Saved User:', savedUser);
    console.log('Saved Organization:', savedOrg);
    return savedUser;
  }
  async getUsers(): Promise<User[]> {
    return this.registeredUserRepository.find();
  }
  async updateUserById(user_uid: UUID, dto: CreateUserDTO) {
    await this.registeredUserRepository.update(user_uid, dto);
    return this.registeredUserRepository.findOne({ where: { userUUID:user_uid } });
  }
  async deleteUserById(user_uid: UUID) {
    return await this.registeredUserRepository.delete({ userUUID:user_uid });
  }
  //organization
  async updateOrganizationById(organization_id: UUID, dto: updateOrgDto) {
    await this.orgRepository.update(organization_id, dto);
    return this.orgRepository.findOne({ where: { id:organization_id } });
  }
  //delete organization
  async deleteOrganizationById(organization_id: UUID) {
    return await this.orgRepository.delete({ id: organization_id });
  }
  //subscription
  async addSubscription(
    SubscriptionDto: SubscriptionDto,
  ): Promise<Subscription> {
    const subscription = this.subsRepository.create({
      user_uid: SubscriptionDto.user_uid,
      organization_id: SubscriptionDto.organization_id,
      invoice_status: SubscriptionDto.invoice_status,
      invoice_link: SubscriptionDto.invoice_link,
      invoice_date: SubscriptionDto.invoice_date,
    });

    const savedSubscription = await this.subsRepository.save(subscription);
    console.log('Saved Team Members:', savedSubscription);
    return savedSubscription;
  }
  async getSubscriptionDetail(): Promise<Subscription[]> {
    return this.subsRepository.find();
  }
  async updateSubscriptionById(user_uid: UUID, dto: SubscriptionDto) {
    await this.subsRepository.update(user_uid, dto);
    return this.subsRepository.findOne({ where: { user_uid } });
  }
  async deleteSubscriptionById(user_uid: UUID) {
    return await this.subsRepository.delete({ user_uid });
  }
  //email report setting
  async createEmailReportSetting(
    EmailReportSettingDto: EmailReportSettingDto,
  ): Promise<EmailReportSettings> {
    const emailreport = this.emailreportRepository.create({
      user_uid: EmailReportSettingDto.user_uid,
      organization_id: EmailReportSettingDto.organization_id,
      monthly: EmailReportSettingDto.monthly,
      weekly: EmailReportSettingDto.weekly,
      daily: EmailReportSettingDto.daily,
      type: EmailReportSettingDto.type,
    });

    const savedReport = await this.emailreportRepository.save(emailreport);
    console.log('Saved Report:', savedReport);
    return savedReport;
  }
  async getReportDetail(): Promise<EmailReportSettings[]> {
    return this.emailreportRepository.find();
  }
  async updateReportById(user_uid: UUID, dto: EmailReportSettingDto) {
    await this.emailreportRepository.update(user_uid, dto);
    return this.emailreportRepository.findOne({ where: { user_uid } });
  }
  async deleteReportById(user_uid: UUID) {
    return await this.emailreportRepository.delete({ user_uid });
  }
  //category
  async createCategory(
    CreateCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const category = this.categoryRepository.create({
      category_uuid: uuidv4(),
      parent_category: CreateCategoryDto.parent_category,
      category_name: CreateCategoryDto.category_name,
    });

    const savedCategory = await this.categoryRepository.save(category);
    console.log('Saved Report:', savedCategory);
    return savedCategory;
  }
  async getCategories(): Promise<Category[]> {
    return this.categoryRepository.find();
  }
  async updateCategoryById(category_uuid: string, dto: CreateCategoryDto) {
    await this.categoryRepository.update(category_uuid, dto);
    return this.categoryRepository.findOne({ where: { category_uuid } });
  }
  async deleteCategoryById(category_uuid: string) {
    return await this.categoryRepository.delete({ category_uuid });
  }
  //unique apps
  async findCategoryByName(category_name: string) {
    return await this.categoryRepository.findOne({ where: { category_name } });
  }
  async createApps(
    CreateUniqueAppsDto: CreateUniqueAppsDto,
  ): Promise<UniqueApps> {
    const obj = this.findCategoryByName(CreateUniqueAppsDto.category_name); //function call to get category_name and parent_category on the basis of uuid

    const categoryId = (await obj).category_uuid;
    const parentcategory = (await obj).parent_category;

    console.log((await obj).category_uuid);
    console.log((await obj).parent_category);

    const apps = this.UniqueAppsRepository.create({
      u_apps_uuid: uuidv4(),
      app_name: CreateUniqueAppsDto.app_name,
      description: CreateUniqueAppsDto.description,
      type: CreateUniqueAppsDto.type,
      category_uuid: categoryId,
      category_name: CreateUniqueAppsDto.category_name,
      parent_category: parentcategory,
    });

    const savedApp = await this.UniqueAppsRepository.save(apps);
    console.log('Saved Apps:', savedApp);
    return savedApp;
  }
  async getApps(): Promise<UniqueApps[]> {
    return this.UniqueAppsRepository.find();
  }
  async updateAppById(u_apps_uuid: string, dto: CreateUniqueAppsDto) {
    await this.UniqueAppsRepository.update(u_apps_uuid, dto);
    return this.UniqueAppsRepository.findOne({ where: { u_apps_uuid } });
  }
  async deleteAppById(u_apps_uuid: string) {
    return await this.UniqueAppsRepository.delete({ u_apps_uuid });
  }
  async getCategoryAppsByNameOrParent(
    categoryName?: string,
    parentCategory?: string,
  ) {
    const whereCondition = parentCategory
      ? [{ category_name: categoryName }, { parent_category: parentCategory }]
      : { category_name: categoryName };

    return await this.UniqueAppsRepository.find({
      where: whereCondition,
    });
  }
  //desktop app
  async createDesktopApp(
    DesktopAppDTO: DesktopAppDTO,
  ): Promise<DesktopAppEntity> {
    const desktopapp = this.desktopAppsRepository.create({
      team_uid: DesktopAppDTO.team_uid,
      user_uuid: DesktopAppDTO.user_uuid,
      organization_id: DesktopAppDTO.organization_id,
      policy_content: DesktopAppDTO.policy_content,
      policy_uuid: DesktopAppDTO.policy_uuid,
    });
    const savedDesktopApp = await this.desktopAppsRepository.save(desktopapp);
    console.log('Saved Desktop App:', savedDesktopApp);
    return savedDesktopApp;
  }
  async getDesktopApp(): Promise<DesktopAppEntity[]> {
    const apps = await this.desktopAppsRepository.find();

    // Parse the policy_content if it is a string
    const parsedApps = apps.map((app) => {
      if (typeof app.policy_content === 'string') {
        return {
          ...app,
          policy_content: JSON.parse(app.policy_content),
        };
      }
      return app;
    });

    console.log(parsedApps);
    return parsedApps;
  }
  async updateDesktopApp(team_uid: UUID, dto: DesktopAppDTO) {
    await this.desktopAppsRepository.update(team_uid, dto);
    return this.desktopAppsRepository.findOne({ where: { team_uid } });
  }
  async deleteDesktopAppById(team_uid: UUID) {
    return await this.desktopAppsRepository.delete({ team_uid });
  }
  //applications
  async createApp(applicationDTO: applicationDTO): Promise<applcationEntity> {
    const app = this.appRepository.create({
      tool_uuid: uuidv4(),
      tool_name: applicationDTO.tool_name,
      productivity_status: applicationDTO.productivity_status,
      setting_uuid: applicationDTO.setting_uuid,
      policy_uuid: applicationDTO.policy_uuid,
    });
    const savedApp = await this.appRepository.save(app);
    console.log('Saved App:', savedApp);
    return savedApp;
  }
  async getApp(): Promise<applcationEntity[]> {
    const apps = await this.appRepository.find();
    return apps;
  }
  async updateAppsById(tool_uuid: UUID, dto: applicationDTO) {
    await this.appRepository.update(tool_uuid, dto);
    return this.appRepository.findOne({ where: { tool_uuid } });
  }
  async deleteAppsById(tool_uuid: UUID) {
    return await this.appRepository.delete({ tool_uuid });
  }
  //productivity settings
  async createSetting(
    CreateProductivitySettingDTO: CreateProductivitySettingDTO,
  ): Promise<ProductivitySettingEntity> {
    const policies = await this.policyRepository.findByIds(CreateProductivitySettingDTO.policyList)
    const setting = this.prodRepository.create({
      setting_uuid: uuidv4(),
      organization_uid: CreateProductivitySettingDTO.organization_uid,
      name: CreateProductivitySettingDTO.name,
      productivity_status: CreateProductivitySettingDTO.productivity_status,
      type: CreateProductivitySettingDTO.type,
      policyList:policies ,
    })
    const savedSetting = await this.prodRepository.save(setting);

    console.log('Saved Setting:', savedSetting);
    return savedSetting;
  }
  async getSetting(): Promise<ProductivitySettingEntity[]> {
    const apps = await this.prodRepository.find();

    // Parse the policy_content if it is a string
    const parsedSetting = apps.map((app) => {
      if (typeof app.type === 'string') {
        return {
          ...app,
          type: JSON.parse(app.type),
        };
      }
      return app;
    });

    console.log(parsedSetting);
    return parsedSetting;
  }
  async updateSettingById(setting_uuid: UUID, dto: CreateProductivitySettingDTO) {
    const { organization_uid, name, productivity_status, type, policyList } = dto;

    // Fetch the policies by the UUIDs provided in the DTO
    const policies = await this.policyRepository.findByIds(policyList);
  
    if (policies.length !== policyList.length) {
      throw new BadRequestException('One or more policies not found');
    }
  
    const setting = await this.prodRepository.findOne({ where: { setting_uuid } });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
  
    setting.organization_uid = organization_uid;
    setting.name = name;
    setting.productivity_status = productivity_status;
    setting.type = type;
    setting.policyList = policies; // Update the policies with actual entities
  }
  async deleteSettingById(setting_uuid: UUID) {
    return await this.prodRepository.delete({ setting_uuid });
  }
  //tracking policy
  async createPolicy(
    trackingPolicyDTO: TrackingPolicyDTO,
  ): Promise<string> {
    const organization = await this.orgRepository.findOne({where: {id: trackingPolicyDTO.organizationId}})
    // const policy = this.policyRepository.create({
    //   policyId: uuidv4(),
    //   organization: trackingPolicyDTO.organization_uid,
    //   assignedTeams: trackingPolicyDTO.team_uuid,
    //   assignedUsers: trackingPolicyDTO.policy_name

    //   // organization_uid: trackingPolicyDTO.organization_uid,
    //   // policy_name: trackingPolicyDTO.policy_name,
    //   // policy_content: trackingPolicyDTO.policy_content,
    //   // team_uuid: trackingPolicyDTO.team_uuid
    // });
    // const savedPolicy = await this.policyRepository.save(policy);
    // console.log('Saved Policy:', savedPolicy);
    return "savedPolicy";
  }
  async getPolicy(): Promise<Policy[]> {
    const apps = await this.policyRepository.find();

    // Parse the policy_content if it is a string
    const parsedPolicy = apps.map((app) => {
      if (typeof app.policyId === 'string') {
        return {
          ...app,
          policy_content: JSON.parse(app.policyName),
        };
      }
      return app;
    });

    console.log(parsedPolicy);
    return parsedPolicy;
  }
  async updatePolicyById(policy_uuid: UUID, dto: TrackingPolicyDTO) {
    await this.policyRepository.update(policy_uuid, dto);
    return this.policyRepository.findOne({ where: {policyId: policy_uuid } });
  }
  async deletePolicyById(policy_uuid: UUID) {
    return await this.policyRepository.delete(policy_uuid);
  }
  //devices
  async createDevice(CreateDevicesDto: CreateDevicesDto): Promise<Devices> {
    const devices = this.deviceRepository.create({
      device_uid: uuidv4(),
      organization_uid: CreateDevicesDto.organization_uid,
      user_name: CreateDevicesDto.user_name,
      user_uid: CreateDevicesDto.user_uid,
    });

    const savedDevice = await this.deviceRepository.save(devices);
    console.log('Saved Device:', savedDevice);
    return savedDevice;
  }
  async getDevices(): Promise<Devices[]> {
    return this.deviceRepository.find();
  }
  async updateDeviceById(device_uid: string, dto: CreateDevicesDto) {
    await this.deviceRepository.update(device_uid, dto);
    return this.deviceRepository.findOne({ where: { device_uid } });
  }
  async deleteDeviceById(device_uid: string) {
    return await this.deviceRepository.delete({ device_uid });
  }
}
