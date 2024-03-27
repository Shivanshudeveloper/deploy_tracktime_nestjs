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
import { Response, response } from 'express';
import { AuthService } from 'src/users/auth.service';
import { TrackTimeStatus, User } from 'src/users/user.entity';
import { validateOrReject } from 'class-validator';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly userService: AuthService,
  ) {}

  @Post('organization')
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.onboardingService.createOrganization(createOrganizationDto);
  }

  @Get('/users/screenshots')
  async getScreenShots(@Res() res: Response) {
    try {
      const images = await this.onboardingService.fetchScreenShot();
      const userData = await this.onboardingService.getAllUserActivityData();
      const getUsersInDb = await this.onboardingService.findAllUsers();

      let finalData = userData.map((user) => {
        images.forEach((image) => {
          const imgUrlExtracted = image?.key.split('/')[1].split('|')[0];
          if (user.activity_uuid === imgUrlExtracted) {
            user['ImgData'] = image;
          }
        });

        getUsersInDb.forEach((u) => {
          if (u.userUUID === user.user_uid) {
            user['user_name'] = u.userName;
          }
        });
        return user;
      });
      // console.log(finalData);
      res.status(200).json(finalData);
    } catch (error) {
      res.status(400).json({
        message: 'Failed to fetch images from wasabi.',
        error: error?.message,
      });
    }
  }

  @Post('desktop-application')
  async createDesktopApplication(
    @Body() createDesktopApplicationDto: CreateDesktopApplicationDto,
  ): Promise<DesktopApplication> {
    return this.onboardingService.createDesktopApplication(
      createDesktopApplicationDto,
    );
  }

  @Post('organization/team')
  async createTeam(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return this.onboardingService.createTeam(createTeamDto);
  }

  @Get('organization/users')
  async getAllUsers(@Res() res: Response): Promise<Response> {
    try {
      const users = await this.onboardingService.findAllUsers();
      const images = await this.onboardingService.fetchScreenShot();
      images.sort((a, b) => {
        const timeA = new Date(a.lastModified).getTime();
        const timeB = new Date(b.lastModified).getTime();
        return timeB - timeA;
      });
      users.map((user) => {
        user['LatestImage'] = null;
        images.map((img) => {
          const userUUID = img?.key.split('/')[1].split('|')[1].split('.')[0];
          // console.log(userUUID)
          if (userUUID === user?.userUUID && !user['LatestImage']) {
            user['LatestImage'] = img;
          }
        });
        return user;
      });

      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch users', error: error.message });
    }
  }

  @Get('organization/users/:id')
  async getUserDetails(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('page') page: number = 1,
    @Query('limit') Limit: number = 10,
  ): Promise<Response> {
    try {
      const user = await this.onboardingService.getUserDetails(id, page, Limit);
      const dataCount = await this.onboardingService.getUserDataCount(id);
      // console.log(user,dataCount);
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
    const organId = req.headers['organizationId'];
    const status = Body?.status;
    const requestingUser = await this.userService.validateUserById(organId);
    // console.log(requestingUser)

    if (!requestingUser?.organization.id) {
      return res.status(403).json({
        message: 'Unauthorized: Only orgnaization can update track time status',
      });
    }

    try {
      const userToUpdate = await this.userService.validateUserById(id);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update trackTimeStatus for the user
      const updatedUserData = await this.onboardingService.updateUserConfig(
        id,
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
    @Res() res,
    @Req() req,
  ): Promise<any> {
    // const isAdmin = userData.isAdmin !== undefined ? userData.isAdmin : false;
    const organizationId = req?.headers['organizationid'];
    const teamId = req?.headers['teamid'];
    try {
      // Default config for new users
      const defaultConfig = {
        trackTimeStatus: TrackTimeStatus.Resume,
      };
      console.log('organizationId', organizationId, 'teamId', teamId);

      if (!organizationId || !teamId) {
        return res.status(401).send({
          message: 'Orgnaization or teams are allowed to create users user.',
        });
      }
      const isValidOrganization =
        this.onboardingService.validateOrganization(organizationId);

      if (!isValidOrganization) {
        return res.status(401).send({ message: 'Not a valid organization' });
      }

      // validate here teamId and also the orangizationId also that is that team which had requestwhile adding
      // the team is that team exist in that
      // orgnaization
      let isUserExist = await this.userService.ValidateUserByGmail(
        userData?.email,
      );
      if (isUserExist?.email) {
        return res.status(401).send({ message: 'User already exists' });
      }

      const newUser = await this.userService.registerUser({
        organizationUUID: organizationId,
        config: defaultConfig,
        teamId,
        email: userData.email,
        userName: userData.userName,
      });

      const uniqueDeviceCreation =
        await this.onboardingService.createDeviceForUser(
          newUser?.organizationUUID,
          newUser?.userName,
          newUser?.email,
        );

      console.log(uniqueDeviceCreation);
      if (!uniqueDeviceCreation) {
        return res.status(400).send({ message: 'Device creation failed' });
      }

      const key = 'an example very very secret key.'; // Replace with a strong secret key
      const iv = crypto.randomBytes(16);
      const encryptedDeviceId = this.encryptData(uniqueDeviceCreation, key, iv);

      const configFilePath = path.join(
        process.cwd(),
        'src',
        'organisation',
        'Installer',
        'dev_config.txt',
      );

      let configContents = fs.readFileSync(configFilePath, 'utf8');

      // let configContents = "";
      //  fs.readFile(configFilePath, 'utf-8',(err,data)=>{
      //   if(err){
      //     console.log(err?.message);
      //     return err?.message;
      //   }
      //   // console.log(data);
      //   configContents = data;
      //   // return data.toString();
      // });

      // console.log(configContents)

      const updatedConfig = configContents.replace(
        /device_id=\w+/gi,
        `device_id=${encryptedDeviceId}`,
      );
      fs.writeFileSync(configFilePath, updatedConfig);

      // res.set('user-id', newUser.userUUID);
      return res.status(200).json({
        message: 'User registered successfully',
        user: newUser,
        uniqueDeviceCreation,
      });
      // return { message: 'User registered successfully', user: newUser };
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to register user',
        error: error,
      });
    }
  }

  private encryptData(data: String, key: string, iv: Buffer): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(data.toString(), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  @Post('/users/configStatus')
  async getConfig(@Req() req, @Res() res, @Body() Body): Promise<any> {
    const device_id = req.headers['device-id']; // Extract device ID from headers
    const organizationId = Body?.organizationId; // Extract organization ID from headers
    const mac_address = Body?.mac_address;
    const username = Body?.device_user_name;
    console.log(device_id, username, mac_address,organizationId)
    try {
      if (!mac_address || !organizationId || !username) {
        return res.status(404).json({ message: 'All fields are required' });
      }
 
      const isExistorganization =await this.onboardingService.validateOrganization(organizationId);
      // console.log("isExistorganization",isExistorganization)
      if (!isExistorganization) {
        return res
          .status(401)
          .json({ message: "Organization with Id doesn't exist" });
      }

      let checkMacAddres =await this.onboardingService.checkDeviceIdExist(
        mac_address,
        username,
      );
      if (!checkMacAddres) {
        let createNewUser = await this.onboardingService.createDeviceForUser(
          organizationId,
          mac_address,
          username,
        );
        checkMacAddres = await createNewUser; 
        
      }

        console.log("checkMacAddres",checkMacAddres);

      let userConfig = await this.onboardingService.getUserConfig(checkMacAddres.toString(),organizationId);
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
      return res.status(200).json({ config:userConfig,device_id:checkMacAddres });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch user config' });
    }
  }
}
