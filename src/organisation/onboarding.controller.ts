import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { CreateOrganizationDto } from './dto/organization.dto';
import { CreateDesktopApplicationDto } from './dto/desktop.dto';
import { CreateTeamDto } from './dto/team.dto';
import { Request, Response, response } from 'express';
import { AuthService } from 'src/users/auth.service';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { validateOrReject } from 'class-validator';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';
import { organizationAdminService } from './OrganizationAdmin.service';
import * as moment from 'moment';
import { CalculatedLogic } from './calculatedLogic.entity';
import { CreateCalculatedLogicDto } from './dto/calculatedLogic.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly userService: AuthService,
    private readonly jwtService: JwtService,
    private readonly organizationAdminService: organizationAdminService,
  ) {}
 
  @Post('organization/register')
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Res() res,
    @Req() req,
  ): Promise<Organization> {
    let token = req?.headers['authorization'];
    token = token?.split(' ')[1];
    try {
      if (!token) {
        return res.status(404).json({ Error: 'Token is missing!!' });
      }

      let isValidToken =
        await this.organizationAdminService.IsValidateToken(token);

      if (!isValidToken) {
        return res.status(401).json({ Error: 'Invalid User!!' });
      }

      let organizationExist = await this.onboardingService.findOrganization(
        createOrganizationDto?.name?.toLowerCase(),
      );

      if (organizationExist) {
        await this.organizationAdminService.updateUserOrganizationId(
          isValidToken?.id,
          organizationExist?.id,
        );
        return res
          .status(200)
          .json({ Error: 'Organization Already Exist!!', organizationExist });
      }
      let newOrganization = await this.onboardingService.createOrganization(
        createOrganizationDto,
      );
      await this.organizationAdminService.updateUserOrganizationId(
        isValidToken?.id,
        newOrganization?.id,
      );
      return res
        .status(201)
        .json({
          Error: 'Organization Created successfully !!',
          newOrganization,
        });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Failed to register organizations !!',
        error: err?.message,
      });
    }
  }

  @Get('/users/screenshots')
  async getScreenShots(@Res() res: Response, @Req() req: Request) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      const images = await this.onboardingService.fetchScreenShot();
      const userData =
        await this.onboardingService.getAllUserActivityData(OrganizationId);
      const getUsersInDb =
        await this.onboardingService.findAllDevices(OrganizationId);
      console.log('images', images);
      console.log('userData', userData);
      // console.log(userData);
      let finalData = userData.map((user) => {
        // console.log(user);
        user['ImgData'] = null;

        images.forEach((image) => {
          const imgUrlExtracted = image?.key.split('/')[1].split('|')[0];
          // console.log("imgUrlExtracted",imgUrlExtracted);
          if (user?.activity_uuid === imgUrlExtracted) {
            user['ImgData'] = image;
          }
          console.log(user['ImgData']);
        });

        getUsersInDb.forEach((u) => {
          if (u.user_uid === user.user_uid) {
            user['device_user_name'] = u.user_name;
          }
        });
        return user;
      });
      console.log('finalData', finalData);
      res.status(200).json(finalData);
    } catch (error) {
      res.status(400).json({
        message: 'Failed to fetch images from wasabi.',
        error: error?.message,
      });
    }
  }

  @Get('/organization/getAttendance')
  async getAttendanceForUser(@Res() res: Response, @Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId) ? organizationAdminId[0] : organizationAdminId;

      console.log(organizationAdminId,organizationAdminIdString);

      const OrganizationId = await this.organizationAdminService.findOrganizationById(organizationAdminIdString);
      console.log(OrganizationId)
      // const OrganizationId = "c9b8dad0-2028-4ef5-8332-31f47033da92";
      
      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      let fromDate: Date;
      let toDate: Date;

      if (from) {
        fromDate = new Date(from);
      } else {
        fromDate = moment().subtract(7, 'days').toDate();
      }

      if (to) {
        toDate = new Date(to);
      } else {
        toDate = new Date();
      }

      const attendanceData = await this.onboardingService.getWeeklyAttendance(OrganizationId, fromDate, toDate);
      return res.status(200).json(attendanceData);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch devices', error: error?.message });
    }
  }

  @Post('desktop-application')
  async createDesktopApplication(
    @Body() createDesktopApplicationDto: CreateDesktopApplicationDto,
    @Res() res,
    @Req() req,
  ): Promise<DesktopApplication> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminId,
        );
      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      console.log('OrganizationId', OrganizationId);
      let isExistingDesktopApplication =
        await this.onboardingService.findDesktopApplication(OrganizationId);

      console.log(isExistingDesktopApplication);

      if (isExistingDesktopApplication?.id) {
        return res.status(200).json({
          message: 'Desktop App Already Exist for your organization !!',
          isExistingDesktopApplication,
        });
      }
      console.log(isExistingDesktopApplication, 'isExistingDesktopApplication');
      createDesktopApplicationDto['organizationId'] = OrganizationId;
      let newDesktopApp = await this.onboardingService.createDesktopApplication(
        createDesktopApplicationDto,
      );
      console.log(newDesktopApp, 'new Desktop Application');
      return res.status(201).json({
        message: 'Sucesssfully Desktop App created for the organization !!',
        newDesktopApp,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch devices', error: error.message });
    }
  }

  @Post('organization/team')
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @Req() req,
    @Res() res,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];

      const organizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminId,
        );

      console.log(
        'OrganizationId retrieved from organizationAdminService:',
        organizationId,
      );

      if (!organizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      createTeamDto.organizationId = organizationId; // Correctly assign the organizationId

      console.log('Updated createTeamDto with organizationId:', createTeamDto);

      const isExistingTeamMember =
        await this.onboardingService.findTeamForOrganization(
          organizationId,
          createTeamDto?.name,
        );

      console.log('isExistingTeamMember:', isExistingTeamMember);

      if (isExistingTeamMember?.id) {
        return res.status(200).json({
          message: 'Team member already exists !!',
          team: isExistingTeamMember,
        });
      }

      const newTeam = await this.onboardingService.createTeam(createTeamDto);
      console.log('newTeam:', newTeam);

      await this.organizationAdminService.findUserAdminByIdAndUpdateStatus(
        organizationAdminId,
      );

      const teams = await this.onboardingService.getAllTeam(organizationId);
      console.log('All teams:', teams);

      return res
        .status(200)
        .json({ message: 'Team created successfully', team: newTeam });
    } catch (err) {
      console.error('Error:', err.message);

      return res
        .status(500)
        .json({ message: 'Failed to create team', error: err.message });
    }
  }

  @Get('organization/getTeam')
  async getTeam(@Res() res: Response, @Req() req: Request): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'];
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    try {
      if (!organizationAdminIdString) {
        return res
          .status(499)
          .json({ message: 'Organization Admin ID is required' });
      }

      // console.log('organizationAdminId', organizationAdminIdString);
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organizationAdminIdString) {
        return res.status(404).json({ message: 'Organization is required' });
      }

      console.log('OrganizationId', OrganizationId);

      let team = await this.onboardingService.findAllTeamsForOrganization(
          OrganizationId,
        );

      console.log('team', team);

      if (!team.length) {

        return res
          .status(404)
          .json({ message: 'No team in the organization Please create one!' });
          
      }

      return res.json({ team: team });
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch users', error: err.message });
    }
  }

  @Get('organization/users')
  async getAllUsers(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    const organizationAdminId = req.headers['organizationAdminId'];

    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    if (!organizationAdminIdString) {
      return res
        .status(400)
        .json({ message: 'Organization Admin ID is required' });
    }

    console.log('organizationAdminId', organizationAdminIdString);

    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      console.log('OrganizationId', OrganizationId);
      const users = await this.onboardingService.findAllUsers(OrganizationId);

      // console.log('users', users);
      const images = await this.onboardingService.fetchScreenShot();
      const teams = await this.onboardingService.getAllTeam(OrganizationId);
      let devices = await this.onboardingService.findAllDevices(OrganizationId);
      // console.log("images",images)
      images.sort((a, b) => {
        const timeA = new Date(a.lastModified).getTime();
        const timeB = new Date(b.lastModified).getTime();
        return timeB - timeA;
      });

      devices = devices.map((user) => {
        user['LatestImage'] = null;
        user['user'] = null;

        images.map((img) => {
          const userUUID = img?.key.split('/')[1].split('|')[1].split('.')[0];
          // console.log("img",img)
          if (userUUID === user?.device_uid && !user['LatestImage']) {
            user['LatestImage'] = img;
          }
        });

        users.length &&
          users.map((u) => {
            if (u?.userUUID == user?.user_uid) {
              user['user'] = u;
            }
            return u;
          });
        return user;
      });

      devices.map((device) => {
        device['teamData'] = null;
        teams.map(async (team) => {
          if (device['user']) {
            // const user_uuid = await this.onboardingService.findUserById(device?.user_uid);
            if (device['user']?.teamId == team?.id) {
              // console.log(team)
              // console.log(user_uuid?.userName)
              device['teamData'] = team;
            }
          }
          return team;
        });

        return device;
      });
      console.log(devices);
      return res.status(200).json(devices);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch users', error: error.message });
    }
  }

  @Get('organization/devices')
  async getAllDevices(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    const organizationAdminId = req.headers['organizationAdminId'];
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;
  
    if (!organizationAdminIdString) {
      return res
        .status(400)
        .json({ message: 'Organization Admin ID is required' });
    }
  
    console.log('organizationAdminId', organizationAdminIdString);
  
    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );
  
      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
  
      const devices =
        await this.onboardingService.findAllDevices(OrganizationId);
  
      const users = await this.onboardingService.findAllUsers(OrganizationId);
      const images = await this.onboardingService.fetchScreenShot();
      const organization =
        await this.onboardingService.fetchAllOrganization(OrganizationId);
      const teams = await this.onboardingService.getAllTeam(OrganizationId);
  
      // Logging the fetched data to ensure it is correct
      console.log('Fetched devices:', devices);
      console.log('Fetched users:', users);
      console.log('Fetched images:', images);
      console.log('Fetched organization:', organization);
      console.log('Fetched teams:', teams);
  
      images.sort((a, b) => {
        const timeA = new Date(a.lastModified).getTime();
        const timeB = new Date(b.lastModified).getTime();
        return timeB - timeA;
      });
  
      devices.forEach((device) => {
        device['LatestImage'] = null;
        device['userDetail'] = null;
        device['organizationDetail'] = organization;
        device['teamDetail'] = null;
  
        images.forEach((img) => {
          const userUUID = img?.key.split('/')[1].split('|')[1].split('.')[0];
          if (userUUID === device?.device_uid && !device['LatestImage']) {
            device['LatestImage'] = img;
          }
        });
  
        users.forEach((user) => {
          if (device?.user_uid === user.userUUID) {
            device['userDetail'] = user;
          }
        });
  
        teams.forEach((team) => {
          users.forEach((user) => {
            if (device?.user_uid === user.userUUID && user.teamId === team.id) {
              device['teamDetail'] = team;
            }
          });
        });
  
        // Log the device after all assignments
        console.log('Processed device:', device);
      });
  
      console.log('Final processed devices:', devices);
      return res.status(200).json({devices,organization});
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      return res
        .status(500)
        .json({ message: 'Failed to fetch devices', error: error.message });
    }
  }
  
  @Get('organization/users/:id')
  async getUserDetails(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') Limit: number = 10,
  ): Promise<Response> {
    const organizationAdminId = req.headers['organizationAdminId'];
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    if (!organizationAdminIdString) {
      return res
        .status(400)
        .json({ message: 'Organization Admin ID is required' });
    }

    console.log('organizationAdminId', organizationAdminIdString);

    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      const user = await this.onboardingService.getUserDetails(
        OrganizationId,
        id,
        page,
        Limit,
      );
      const dataCount = await this.onboardingService.getUserDataCount(id);
      console.log(user, dataCount);
      return res.status(200).json({ user, dataCount });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({
        message: 'Failed to fetch user details',
        error: error.message,
      });
    }
  }

  @Patch('organization/users/:userId')
  async updateTrackStatus(
    @Req() req,
    @Res() res,
    @Param('userId') id: string,
    @Body() Body,
    // @Param('userId') userId: string,
  ): Promise<any> {
    // Check if the requesting user is an admin
    const organizationAdminIdString = req.headers['organizationAdminId'];
    const status = Body?.status;
    const OrganizationId = await this.organizationAdminService.findOrganizationById(
      organizationAdminIdString,
    );
    const requestingUser = await this.onboardingService.validateDeviceById(id);
    // console.log(requestingUser)
    // console.log(req.headers["authorization"]);
    // console.log("organizationId",OrganizationId)
    // console.log("requestingUser",requestingUser);

    if (!requestingUser?.organization_uid) {
      return res.status(401).json({
        message: 'Unauthorized: Only orgnaization can update track time status',
      });
    }

    try {
      const userToUpdate = await this.onboardingService.validateDeviceById(requestingUser?.device_uid);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update trackTimeStatus for the user
      const updatedUserData = await this.onboardingService.updateUserConfig(
        userToUpdate?.device_uid,
        status,
      );

      return res.status(200).json({
        message: 'Track time status updated successfully',
        updatedUserData,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to update track time status' });
    }
  }

  @Patch('/organization/devices/:deviceId')
  async updateDeviceUser(
    @Req() req: Request,
    @Res() res: Response,
    @Param('deviceId') deviceId: string,
    @Query('user_id') userId: string,
  ): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'] as string;

    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    const OrganizationId =
      await this.organizationAdminService.findOrganizationById(
        organizationAdminIdString,
      );

    if (!OrganizationId) {
      return res.status(404).json({ error: 'Organization not found !!' });
    }
    if (!userId || !deviceId) {
      return res.status(404).json({ error: 'All fields are required !!' });
    }

    try {
      const deviceToUpdate =
        await this.onboardingService.validateDeviceById(deviceId);
      if (!deviceToUpdate?.device_uid) {
        return res.status(404).json({ message: 'Device not found' });
      }

      const isUserIdLink = await this.onboardingService.validateUserIdLinked(
        userId,
        deviceId,
      );
      // Update user_uid for the device
      deviceToUpdate.user_uid = userId;

      const updatedDevice =
        await this.onboardingService.updateDevice(deviceToUpdate);

      return res.status(200).json({
        message: 'Device user updated successfully',
        updatedDevice,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to update device user' });
    }
  }

  @Patch('/organization/devices/r/:deviceId')
  async RemoveUserIdFromDevice(
    @Req() req: Request,
    @Res() res: Response,
    @Param('deviceId') deviceId: string,
  ): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'] as string;

    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    const OrganizationId =
      await this.organizationAdminService.findOrganizationById(
        organizationAdminIdString,
      );

    if (!OrganizationId) {
      return res.status(404).json({ error: 'Organization not found !!' });
    }
    if (!deviceId) {
      return res.status(404).json({ error: 'All fields are required !!' });
    }

    try {
      const deviceToUpdate =
        await this.onboardingService.validateDeviceById(deviceId);
      if (!deviceToUpdate?.device_uid) {
        return res.status(404).json({ message: 'Device not found' });
      }

      // const isUserIdLink = await this.onboardingService.validateUserIdLinked(userId, deviceId);
      // Update user_uid for the device
      deviceToUpdate.user_uid = null;

      const updatedDevice =
        await this.onboardingService.updateDevice(deviceToUpdate);

      return res.status(200).json({
        message: 'Device user updated successfully',
        updatedDevice,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to update device user' });
    }
  }

  // @Get('organization/users/limit=2&&page=1')
  // async getAllUsers(@Res() res: Response): Promise<Response> {
  //   try {
  //     const users = await this.onboardingService.findAllUsers();
  //     return res.status(200).json(users);
  //   } catch (error) {
  //     return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  //   }
  // }
  @Post('register/user')
  async registerUser(
    @Body() userData: Partial<User>,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'];
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;
    const OrganizationId =
      await this.organizationAdminService.findOrganizationById(
        organizationAdminIdString,
      );

    if (!OrganizationId) {
      return res.status(404).json({ error: 'Organization not found !!' });
    }

    const organizationId = OrganizationId;
    const teamId = userData?.teamId;
    try {
      if (!organizationId || !teamId) {
        return res.status(401).send({
          message: 'Organization or teams are required to create users.',
        });
      }

      const isValidOrganization =
        await this.onboardingService.validateOrganization(organizationId);
      if (!isValidOrganization) {
        return res.status(401).send({ message: 'Not a valid organization' });
      }

      const isValidTeam =
        await this.onboardingService.findTeamForOrganizationWithId(
          organizationId,
          teamId,
        );
      if (!isValidTeam?.id) {
        return res.status(401).send({ message: 'Not a valid team' });
      }

      let isUserExist = await this.onboardingService.ValidateUserByGmail(
        userData?.email,
      );
      if (!isUserExist?.email) {
        userData['organizationId'] = organizationId;

        isUserExist = await this.userService.registerUser({ ...userData });
        console.log('User registered here...');
      }

      const uniqueDeviceCreation =
        await this.onboardingService.createDeviceForUser(
          isUserExist?.organizationId,
          isUserExist?.userName,
          isUserExist?.email,
          isUserExist?.userUUID,
          '',
        );

      if (!uniqueDeviceCreation) {
        return res.status(400).send({ message: 'Device creation failed' });
      }

      // Encryption part (similar to Rust)
      const key = Buffer.from('an example very very secret key.', 'utf-8'); // 32 bytes key
      const iv = Buffer.alloc(16, 0); // 16 bytes IV initialized to zeros

      const encryptData = (data: string, key: Buffer, iv: Buffer): string => {
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
      };

      const encryptedDeviceId = encryptData(uniqueDeviceCreation, key, iv);
      const encryptedOrganizationId = encryptData(organizationId, key, iv);

      const configFilePath = path.join(
        process.cwd(),
        'src',
        'organisation',
        'Installer',
        'dev_config.txt',
      );

      console.log('encrypted Organization id', encryptedOrganizationId);
      console.log('encrypted device id', encryptedDeviceId);

      try {
        let configContents = fs.readFileSync(configFilePath, 'utf8');
        const updatedConfig = configContents
          .replace(/device_id=[^\n]*/gi, `device_id=${encryptedDeviceId}`)
          .replace(
            /organizationId=[^\n]*/gi,
            `organizationId=${encryptedOrganizationId}`,
          );

        fs.writeFileSync(configFilePath, updatedConfig);
        console.log('Config file updated successfully');

        res.set({
          'Content-Disposition': 'attachment; filename=dev_config.txt',
          'Content-Type': 'text/plain',
        });
        return res.status(201).send(updatedConfig);
      } catch (err) {
        console.error('Error updating config file:', err);
        return res.status(500).json({
          message: 'Failed to update configuration file',
          error: err.message,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Failed to register user',
        error: error.message,
      });
    }
  }

  private encryptData(data: String, key: string, iv: Buffer): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(data.toString(), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  @Post('users/configStatus')
  async getConfig(@Req() req, @Res() res, @Body() Body): Promise<any> {
    const device_id = req.headers['device-id'] || 'null'; // Extract device ID from headers
    const organizationId = Body?.organizationId; // Extract organization ID from headers
    const mac_address = Body?.mac_address;
    const username = Body?.device_user_name;
    console.log(device_id, username, mac_address, organizationId);

    try {
      if (!mac_address || !organizationId || !username) {
        return res.status(404).json({ message: 'All fields are required' });
      }

      const isExistorganization =
        await this.onboardingService.validateOrganization(organizationId);

      console.log('isExistorganization', isExistorganization);
      if (!isExistorganization) {
        return res
          .status(401)
          .json({ message: "Organization with Id doesn't exist" });
      }
      // let userExist = await this.onboardingService.findUserByEmail(email);
      let deviceExist = null;
      console.log('device_id_in_here', device_id);
      if (device_id !== 'null') {
        console.log('checking with device-id', device_id);
        let checkDeviceId =
          await this.onboardingService.checkDeviceIdExistWithDeviceId(
            mac_address,
            device_id,
            username,
          );
        deviceExist = checkDeviceId;
        
      } else {
        console.log('checking without device-id', device_id);
        let checkMacAddres = await this.onboardingService.checkDeviceIdExist(
          mac_address,
          username,
        );
        console.log('checkMacAddres', checkMacAddres);

        deviceExist = checkMacAddres;
      }
      // creating device for users here
      console.log('deviceExist', deviceExist);

      const user_uuid = '';
      const email = '';
      if (!deviceExist) {
        let createNewUser = await this.onboardingService.createDeviceForUser(
          organizationId,
          username,
          email,
          user_uuid,
          mac_address,
        );
        deviceExist = await createNewUser;
      }

      console.log('device-id', deviceExist);

      let userConfig = await this.onboardingService.getUserConfig(
        deviceExist.toString(),
        organizationId,
      );

      console.log("userConfig",userConfig);
      // Retrieve user config and track time status based on user ID

      // if (!userConfig) {
      //   const createdDeviceId =
      //     await this.onboardingService.createDeviceIdForUser(
      //       mac_address,
      //       username,
      //       organizationId,
      //     );
      // }
      // if (!userConfig) {
      //   return res.status(404).json({ message: 'User not found' });
      // }

      // const isPaidUser = await this.userService.isUserPaid(userId);
      // // Construct response with user's config and track time status
      // const response = {
      //   config: {
      //     trackTimeStatus: userConfig.trackTimeStatus,
      //     isPaid: !isPaidUser,
      //     // Other user-specific config details here
      //   },
      // };
      console.log(deviceExist, 'deviceExist', userConfig, 'userConfig');
      return res
        .status(202)
        .json({ config: userConfig, device_id: deviceExist });
    } catch (error) {
      return res
        .status(500)
        .json({
          message: 'Failed to fetch user config',
          error: error?.message,
        });
    }
  }

  @Get('/hourly')
  async getHourlyProductivity(@Res() res: Response, @Req() req: Request): Promise<Response> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const OrganizationId = await this.organizationAdminService.findOrganizationById(organizationAdminIdString);

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      const date = req.query.date as string;
      const dateString = Array.isArray(date) ? date[0] : (date || new Date().toISOString().split('T')[0]);

      const data = await this.onboardingService.getProductivityData(OrganizationId, dateString);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to fetch productivity data',
        error: error.message,
      });
    }
  }

  @Post("/organization/calculatedLogic")
  async createCalculatedLogic(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: CreateCalculatedLogicDto,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;
  
      const organization = await this.organizationAdminService.findOrganizationById(organizationAdminIdString);
  
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      console.log(organization);
      const calculatedLogic = await this.onboardingService.createCalculatedLogic(body, organization);
      
      return res.status(201).json({calculatedLogic,message:"Caculated logic successfully created."});
  
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to create Calculated Logic',
        error: error?.message,
      });
    }
  }

}
