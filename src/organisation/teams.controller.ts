import { applicationDTO } from './dto/applications.dto';
import { CreateTeamDTO } from './dto/teams.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { teamAndTeamMemberService } from './teams.service';
import { CreateTeamMembersDto } from './dto/teammembers.dto';
import { TeamMember } from './teammembers.entity';
import { UUID } from 'crypto';
import { registeredUsersDto } from './dto/registeredusers.dto';
import { UpdateUserDto } from './dto/UpdateUserDto.dto';
import { updateOrgDto } from './dto/updateorg.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { Subscription } from './subscription.entity';
import { EmailReportSettingDto } from './dto/emailreportsetting.dto';
import { EmailReportSettings } from './emailreportsetting.entity';
import { CreateCategoryDto } from './dto/category.dto';
import { Category } from './category.entity';
import { CreateUniqueAppsDto } from './dto/uniqueapps.dto';
import { UniqueApps } from './uniqueapps.entity';
import { DesktopAppDTO } from './dto/desktopapp.dto';
import { DesktopAppEntity } from './desktopapp.entity';
import { applcationEntity } from './application.entity';
import { CreateProductivitySettingDTO } from './dto/prodsetting.dto';
import { ProductivitySettingEntity } from './prodsetting.entity';
import { TrackingPolicyDTO } from './dto/tracingpolicy.dto';
import { Policy } from './trackingpolicy.entity';
import { CreateDevicesDto } from './dto/devices.dto';
import { Devices } from './devices.entity';
import { CreateUserDTO } from './dto/users.dto';
import { User } from 'src/users/user.entity';
@Controller('team')
export class TeamAndTeamMemberController {
  constructor(
    private readonly teamAndTeamMemberService: teamAndTeamMemberService,
  ) {}

  // @Post('/addteam')
  // async createTeam(@Body() CreateTeamsDto: CreateTeamDTO): Promise<Teams> {
  //   return this.teamAndTeamMemberService.createTeam(CreateTeamsDto);
  // }
  // @Get('/getteam')
  // async getTeam(): Promise<Teams[]> {
  //   return this.teamAndTeamMemberService.getTeam();
  // }
  // @Put('/updateteam/:id')
  // updateById(@Param('id') id: UUID, @Body() dto: CreateTeamDTO) {
  //   return this.teamAndTeamMemberService.updateById(id, dto);
  // }
  @Delete('/deleteteam/:id')
  deleteById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteById(id);
  }
  @Get('/getteamdetails/:id') // get team details by team member id
  async getTeamDetails(@Param('id') id: string) {
    return await this.teamAndTeamMemberService.getTeamDetailsByTeamId(id);
  }
  @Post('addteammember')
  async addTeamMembers(
    @Body() CreateTeamMembersDto: CreateTeamMembersDto,
  ): Promise<TeamMember> {
    return await this.teamAndTeamMemberService.addTeamMembers(
      CreateTeamMembersDto,
    );
  }
  @Get('/getteammembers')
  async getTeamMembers(): Promise<TeamMember[]> {
    return this.teamAndTeamMemberService.getTeamMembers();
  }
  @Put('/updateteammembers/:id')
  updateTeamMembersById(
    @Param('id') id: UUID,
    @Body() dto: CreateTeamMembersDto,
  ) {
    return this.teamAndTeamMemberService.updateTeamMembersById(id, dto);
  }
  @Delete('/deleteteammembers/:id')
  deleteTeamMembersById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteTeamMembersById(id);
  }
  //users
  @Post('/registeruser')
  async registerUser(
    @Body() registeredUsersDto: CreateUserDTO,
  ): Promise<User> {
    return this.teamAndTeamMemberService.registerUser(registeredUsersDto);
  }
  @Get('/getusers')
  async getUsers(): Promise<User[]> {
    return this.teamAndTeamMemberService.getUsers();
  }
  @Put('/updateusers/:id')
  updateUserById(@Param('id') id: UUID, @Body() dto: CreateUserDTO) {
    return this.teamAndTeamMemberService.updateUserById(id, dto);
  }
  @Delete('/deleteuser/:id')
  deleteUserById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteUserById(id);
  }
  //organization
  @Put('/updateorg/:id')
  async updateOrganizationById(
    @Param('id') id: UUID,
    @Body() dto: updateOrgDto,
  ) {
    return this.teamAndTeamMemberService.updateOrganizationById(id, dto);
  }
  @Delete('/deleteorg/:id')
  async deleteOrganizationById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteOrganizationById(id);
  }
  //subscription
  @Post('/addsubscription')
  async addSubscription(
    @Body() SubscriptionDto: SubscriptionDto,
  ): Promise<Subscription> {
    return this.teamAndTeamMemberService.addSubscription(SubscriptionDto);
  }
  @Get('/getsubscriptiondetails')
  async getSubscriptionDetail(): Promise<Subscription[]> {
    return this.teamAndTeamMemberService.getSubscriptionDetail();
  }
  @Put('/updatesubsription/:id')
  updateSubscriptionById(@Param('id') id: UUID, @Body() dto: SubscriptionDto) {
    return this.teamAndTeamMemberService.updateSubscriptionById(id, dto);
  }
  @Delete('/deletesubscription/:id')
  deleteSubscriptionById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteSubscriptionById(id);
  }
  //email reporting setting
  @Post('/createemailreportsetting')
  async createEmailReportSetting(
    @Body() EmailReportSettingDto: EmailReportSettingDto,
  ): Promise<EmailReportSettings> {
    return this.teamAndTeamMemberService.createEmailReportSetting(
      EmailReportSettingDto,
    );
  }
  @Get('/getreportdetails')
  async getReportDetail(): Promise<EmailReportSettings[]> {
    return this.teamAndTeamMemberService.getReportDetail();
  }
  @Put('/updatereport/:id')
  updateReportById(@Param('id') id: UUID, @Body() dto: EmailReportSettingDto) {
    return this.teamAndTeamMemberService.updateReportById(id, dto);
  }
  @Delete('/deletereport/:id')
  deleteReportById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteReportById(id);
  }
  //category
  @Post('/createcategory')
  async createCategory(
    @Body() CreateCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.teamAndTeamMemberService.createCategory(CreateCategoryDto);
  }
  @Get('/getcategories')
  async getCategories(): Promise<Category[]> {
    return this.teamAndTeamMemberService.getCategories();
  }
  @Put('/updatecategory/:id')
  updateCategoryById(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.teamAndTeamMemberService.updateCategoryById(id, dto);
  }
  @Delete('/deletecategory/:id')
  deleteCategoryById(@Param('id') id: string) {
    return this.teamAndTeamMemberService.deleteCategoryById(id);
  }
  //unique apps
  @Post('/createuniqueapps')
  async createApps(
    @Body() CreateUniqueAppsDto: CreateUniqueAppsDto,
  ): Promise<UniqueApps> {
    return this.teamAndTeamMemberService.createApps(CreateUniqueAppsDto);
  }
  @Get('/getapps')
  async getApps(): Promise<UniqueApps[]> {
    return this.teamAndTeamMemberService.getApps();
  }
  @Put('/updateapps/:id')
  async updateAppById(
    @Param('id') id: string,
    @Body() dto: CreateUniqueAppsDto,
  ) {
    return this.teamAndTeamMemberService.updateAppById(id, dto);
  }
  @Delete('/deleteapps/:id')
  async deleteAppById(@Param('id') id: string) {
    return this.teamAndTeamMemberService.deleteAppById(id);
  }
  //input - category or parent category name outputs apps in that category
  @Get('/getcategoryapps')
  getCategoryAppsByNameOrParent(
    @Query('category_name') categoryName?: string,
    @Query('parent_category') parentCategory?: string,
  ) {
    return this.teamAndTeamMemberService.getCategoryAppsByNameOrParent(
      categoryName,
      parentCategory,
    );
  }
  //desktop_app
  @Post('/createdesktopapp')
  async createDesktopApp(
    @Body() DesktopAppDTO: DesktopAppDTO,
  ): Promise<DesktopAppEntity> {
    return this.teamAndTeamMemberService.createDesktopApp(DesktopAppDTO);
  }
  @Get('/getdesktopapp')
  @Header('Content-Type', 'application/json')
  async getDesktopApp(): Promise<DesktopAppEntity[]> {
    return this.teamAndTeamMemberService.getDesktopApp();
  }
  @Put('/updatedesktopapp/:id')
  async updateDesktopApp(@Param('id') id: UUID, @Body() dto: DesktopAppDTO) {
    return this.teamAndTeamMemberService.updateDesktopApp(id, dto);
  }
  @Delete('/deletedesktopapp/:id')
  async deleteDesktopAppById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteDesktopAppById(id);
  }
  //applications
  @Post('/createapp')
  async createApp(
    @Body() applicationDTO: applicationDTO,
  ): Promise<applcationEntity> {
    return this.teamAndTeamMemberService.createApp(applicationDTO);
  }
  @Get('/getapp')
  async getApp(): Promise<applcationEntity[]> {
    return this.teamAndTeamMemberService.getApp();
  }
  @Put('/updateapp/:id')
  async updateAppsById(@Param('id') id: UUID, @Body() dto: applicationDTO) {
    return this.teamAndTeamMemberService.updateAppsById(id, dto);
  }
  @Delete('/deleteapp/:id')
  async deleteAppsById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteAppsById(id);
  }
  //productivity settings
  @Post('/createsetting')
  async createSetting(
    @Body() CreateProductivitySettingDTO: CreateProductivitySettingDTO,
  ): Promise<ProductivitySettingEntity> {
    return this.teamAndTeamMemberService.createSetting(CreateProductivitySettingDTO);
  }
  @Get('/getsetting')
  async getSetting(): Promise<ProductivitySettingEntity[]> {
    return this.teamAndTeamMemberService.getSetting();
  }
  @Put('/updatesetting/:id')
  async updateSettingById(
    @Param('id') id: UUID,
    @Body() dto: CreateProductivitySettingDTO,
  ) {
    return this.teamAndTeamMemberService.updateSettingById(id, dto);
  }
  @Delete('/deletesetting/:id')
  async deleteSettingById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deleteSettingById(id);
  }
  //tracking policy
  // @Post('/createpolicy')
  // async createPolicy(
  //   @Body() trackingPolicyDTO: TrackingPolicyDTO,
  // ): Promise<Policy> {
  //   return this.teamAndTeamMemberService.createPolicy(trackingPolicyDTO);
  // }
  @Get('/getpolicy')
  async getPolicy(): Promise<Policy[]> {
    return this.teamAndTeamMemberService.getPolicy();
  }
  // @Put('/updatepolicy/:id')
  // async updatePolicyById(
  //   @Param('id') id: UUID,
  //   @Body() dto: trackingPolicyDTO,
  // ) {
  //   return this.teamAndTeamMemberService.updatePolicyById(id, dto);
  // }
  @Delete('/deletepolicy/:id')
  async deletePolicyById(@Param('id') id: UUID) {
    return this.teamAndTeamMemberService.deletePolicyById(id);
  }
  //devices
  @Post('/createdevice')
  async createDevice(
    @Body() CreateDevicesDto: CreateDevicesDto,
  ): Promise<Devices> {
    return this.teamAndTeamMemberService.createDevice(CreateDevicesDto);
  }
  @Get('/getdevices')
  async getDevices(): Promise<Devices[]> {
    return this.teamAndTeamMemberService.getDevices();
  }
  @Put('/updatedevice/:id')
  updateDeviceById(@Param('id') id: string, @Body() dto: CreateDevicesDto) {
    return this.teamAndTeamMemberService.updateDeviceById(id, dto);
  }
  @Delete('/deletedevice/:id')
  deleteDeviceById(@Param('id') id: string) {
    return this.teamAndTeamMemberService.deleteDeviceById(id);
  }
}
