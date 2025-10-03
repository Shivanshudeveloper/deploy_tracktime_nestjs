import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  DeployFlaskBaseApi,
  LocalFlaskBaseApi,
  OnboardingService,
} from './onboarding.service';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { CreateOrganizationDTO } from './dto/organization.dto';
import { CreateDesktopApplicationDto } from './dto/desktop.dto';
import { CreateTeamDTO } from './dto/teams.dto';
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
import { OrganizationDetails } from 'aws-sdk/clients/guardduty';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TrackingPolicyDTO } from './dto/tracingpolicy.dto';
import * as archiver from 'archiver'; // For creating zip files
import * as AdmZip from 'adm-zip'; // For modifying Windows installers
import axios from 'axios';
import {
  AdminProfileResponseDto,
  UpdateAdminProfileDto,
} from './dto/adminProfile.dto';
import { WasabiUploadService } from './wasabi-upload.service';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly userService: AuthService,
    private readonly jwtService: JwtService,
    private readonly organizationAdminService: organizationAdminService,
    private readonly wasabiUploadService: WasabiUploadService,
  ) {}

  @Post('organization/register')
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDTO,
    @Res() res,
    @Req() req,
  ): Promise<Organization> {
    let token = req?.headers['authorization'];
    token = token?.split(' ')[1];
    try {
      // if (!token) {
      //   return res.status(404).json({ Error: 'Token is missing!!' });
      // }

      // let isValidToken =
      //   await this.organizationAdminService.IsValidateToken(token);

      // if (!isValidToken) {
      //   return res.status(401).json({ Error: 'Invalid User!!' });
      // }
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      let organizationExist = await this.onboardingService.findOrganization(
        createOrganizationDto?.name?.toLowerCase(),
        organizationAdminIdString,
      );

      if (organizationExist) {
        await this.organizationAdminService.updateUserOrganizationId(
          organizationAdminIdString,
          organizationExist?.id,
        );
        return res
          .status(200)
          .json({ Error: 'Organization Already Exist!!', organizationExist });
      }
      let newOrganization = await this.onboardingService.createOrganization(
        createOrganizationDto,
      );

      await this.onboardingService.createCalculatedLogicForNewOrganization(
        newOrganization.id,
      );
      await this.organizationAdminService.updateUserOrganizationId(
        organizationAdminIdString,
        newOrganization?.id,
      );

      return res.status(201).json({
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

  @Get('admin/profile')
  async getAdminProfile(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<AdminProfileResponseDto>> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'] as string;
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
          success: false,
        });
      }

      console.log('Fetching admin profile for ID:', organizationAdminIdString);

      // Get admin profile data
      const profileData =
        await this.organizationAdminService.getAdminProfileData(
          organizationAdminIdString,
        );

      if (!profileData) {
        return res.status(404).json({
          message: 'Admin profile not found',
          success: false,
        });
      }

      return res.status(200).json({
        message: 'Admin profile fetched successfully',
        success: true,
        data: profileData,
      });
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return res.status(500).json({
        message: 'Failed to fetch admin profile',
        error: error.message,
        success: false,
      });
    }
  }

  @Patch('admin/profile')
  async updateAdminProfile(
    @Req() req: Request,
    @Res() res: Response,
    @Body() updateData: UpdateAdminProfileDto,
  ): Promise<Response<AdminProfileResponseDto>> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'] as string;
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
          success: false,
        });
      }

      console.log('Updating admin profile for ID:', organizationAdminIdString);
      console.log('Update data:', updateData);

      // Validate input data
      if (!updateData.personal && !updateData.company) {
        return res.status(400).json({
          message: 'At least personal or company information must be provided',
          success: false,
        });
      }

      // Update admin profile data
      const updatedProfile =
        await this.organizationAdminService.updateAdminProfileData(
          organizationAdminIdString,
          updateData,
        );

      if (!updatedProfile) {
        return res.status(404).json({
          message: 'Failed to update admin profile',
          success: false,
        });
      }

      return res.status(200).json({
        message: 'Admin profile updated successfully',
        success: true,
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error updating admin profile:', error);
      return res.status(500).json({
        message: 'Failed to update admin profile',
        error: error.message,
        success: false,
      });
    }
  }
  @Post('admin/upload-avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const adminId = req.headers['organizationadminid'] || 'unknown';
          const uniqueSuffix = `${adminId}-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'] as string;
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
          success: false,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: 'No file uploaded',
          success: false,
        });
      }

      const fileUrl = `/uploads/avatars/${file.filename}`;

      // Update admin avatar in database
      await this.organizationAdminService.updateAdminAvatar(
        organizationAdminIdString,
        fileUrl,
      );

      return res.status(200).json({
        message: 'Avatar uploaded successfully',
        success: true,
        fileUrl: fileUrl,
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return res.status(500).json({
        message: 'Failed to upload avatar',
        error: error.message,
        success: false,
      });
    }
  }

  @Post('admin/upload-profile-logo-wasabi')
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadProfileLogoToWasabi(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationadminid'] as string;
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
          success: false,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: 'No file uploaded',
          success: false,
        });
      }

      this.logger.log(`🖼️ Uploading profile logo for admin: ${organizationAdminIdString}`);

      // Upload to Wasabi with WebP optimization
      const uploadResult = await this.wasabiUploadService.uploadProfileLogo(
        file,
        organizationAdminIdString,
      );

      // Update admin profile logo in database with WebP object key
      await this.organizationAdminService.updateAdminProfileLogo(
        organizationAdminIdString,
        uploadResult.objectKey, // Store the object key, not the URL
      );

      return res.status(200).json({
        message: 'Profile logo uploaded successfully',
        success: true,
        logoUrl: uploadResult.webpUrl,
        originalUrl: uploadResult.originalUrl,
        objectKey: uploadResult.objectKey,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to upload profile logo: ${error.message}`);
      return res.status(500).json({
        message: 'Failed to upload profile logo',
        error: error.message,
        success: false,
      });
    }
  }

  @Get('admin/profile-logo-signed-url/:adminId')
  async getProfileLogoSignedUrl(
    @Param('adminId') adminId: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // Get the object key from database
      const adminProfile = await this.organizationAdminService.getAdminProfileData(adminId);
      
      if (!adminProfile || !adminProfile.avatar) {
        return res.status(404).json({
          message: 'Profile logo not found',
          success: false,
        });
      }

      // Generate signed URL
      const signedUrl = await this.wasabiUploadService.getProfileLogoSignedUrl(adminProfile.avatar);

      return res.status(200).json({
        message: 'Profile logo signed URL generated successfully',
        success: true,
        signedUrl,
        objectKey: adminProfile.avatar,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to generate profile logo signed URL: ${error.message}`);
      return res.status(500).json({
        message: 'Failed to generate profile logo signed URL',
        error: error.message,
        success: false,
      });
    }
  }

  @Get('organization/logo-signed-url/:organizationId')
  async getOrganizationLogoSignedUrl(
    @Param('organizationId') organizationId: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // Get the organization logo object key from database
      const organization = await this.onboardingService.getOrganizationDetails(organizationId);
      
      if (!organization || !organization.logo) {
        return res.status(404).json({
          message: 'Organization logo not found',
          success: false,
        });
      }

      // Generate signed URL
      const signedUrl = await this.wasabiUploadService.getOrganizationLogoSignedUrl(organization.logo);

      return res.status(200).json({
        message: 'Organization logo signed URL generated successfully',
        success: true,
        signedUrl,
        objectKey: organization.logo,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to generate organization logo signed URL: ${error.message}`);
      return res.status(500).json({
        message: 'Failed to generate organization logo signed URL',
        error: error.message,
        success: false,
      });
    }
  }

  @Post('organization/upload-logo-wasabi')
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadOrganizationLogoToWasabi(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // HTTP headers are case-insensitive and get converted to lowercase by Express
      const organizationAdminId = req.headers['organizationadminid'] as string;
      const adminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      this.logger.log(`📋 Received organizationAdminId from headers: ${adminIdString}`);

      if (!adminIdString || adminIdString === 'null' || adminIdString === 'undefined') {
        this.logger.error(`❌ Invalid admin ID: ${adminIdString}`);
        return res.status(400).json({
          message: 'Valid Organization Admin ID is required in headers',
          success: false,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: 'No file uploaded',
          success: false,
        });
      }

      this.logger.log(`🖼️ Uploading organization logo for admin: ${adminIdString}`);

      // Get organization ID from admin ID
      const organizationId = await this.organizationAdminService.findOrganizationById(adminIdString);
      
      if (!organizationId) {
        return res.status(404).json({
          message: 'Organization not found for this admin',
          success: false,
        });
      }

      this.logger.log(`📋 Found organization ID: ${organizationId}`);

      // Upload to Wasabi with WebP optimization
      const uploadResult = await this.wasabiUploadService.uploadOrganizationLogo(
        file,
        organizationId,
      );

      // Update organization logo in database with WebP object key
      await this.onboardingService.updateOrganizationLogo(
        organizationId,
        uploadResult.objectKey, // Store the object key, not the URL
      );

      return res.status(200).json({
        message: 'Organization logo uploaded successfully',
        success: true,
        logoUrl: uploadResult.webpUrl,
        originalUrl: uploadResult.originalUrl,
        objectKey: uploadResult.objectKey,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to upload organization logo: ${error.message}`);
      return res.status(500).json({
        message: 'Failed to upload organization logo',
        error: error.message,
        success: false,
      });
    }
  }

  @Post('admin/upload-logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const adminId = req.headers['organizationadminid'] || 'unknown';
          const uniqueSuffix = `${adminId}-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for logos
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'] as string;
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
          success: false,
        });
      }

      if (!file) {
        return res.status(400).json({
          message: 'No file uploaded',
          success: false,
        });
      }

      const fileUrl = `/uploads/logos/${file.filename}`;

      // Update organization logo in database
      const admin = await this.organizationAdminService.getAdminBasicInfo(
        organizationAdminIdString,
      );
      if (admin.OrganizationId) {
        await this.organizationAdminService.updateOrganizationLogo(
          admin.OrganizationId,
          fileUrl,
        );
      }

      return res.status(200).json({
        message: 'Logo uploaded successfully',
        success: true,
        fileUrl: fileUrl,
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      return res.status(500).json({
        message: 'Failed to upload logo',
        error: error.message,
        success: false,
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
      // console.log('images', images);
      // console.log('userData', userData);
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
          // console.log(user['ImgData']);
        });

        getUsersInDb.forEach((u) => {
          if (u.user_uid === user.user_uid) {
            user['device_user_name'] = u.user_name;
          }
        });
        return user;
      });
      // console.log('finalData', finalData);
      res.status(200).json(finalData);
    } catch (error) {
      res.status(400).json({
        message: 'Failed to fetch images from wasabi.',
        error: error?.message,
      });
    }
  }

  @Get('/organization/getAttendance')
  async getAttendanceForUser(
    @Res() res: Response,
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      console.log(organizationAdminId, organizationAdminIdString);

      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );
      console.log(OrganizationId);
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

      const attendanceData = await this.onboardingService.getWeeklyAttendance(
        OrganizationId,
        fromDate,
        toDate,
      );
      return res.status(200).json(attendanceData);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch devices', error: error?.message });
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
    @Body() createTeamDto: CreateTeamDTO,
    @Req() req,
    @Res() res,
  ): Promise<any> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];

      const organizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminId,
        );

      console.log(organizationId);

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

    console.log('=== GET TEAM REQUEST ===');
    console.log('Organization Admin ID:', organizationAdminIdString);

    try {
      if (!organizationAdminIdString) {
        console.error('Missing Organization Admin ID');
        return res.status(400).json({
          message: 'Organization Admin ID is required',
        });
      }

      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      console.log('Organization ID found:', OrganizationId);

      if (!OrganizationId) {
        console.error(
          'Organization not found for admin ID:',
          organizationAdminIdString,
        );
        return res.status(404).json({
          message: 'Organization not found',
        });
      }

      console.log('Fetching teams, devices, and users...');

      // Fetch teams, devices, and users in parallel
      const [teams, devices, users] = await Promise.all([
        this.onboardingService.findAllTeamsForOrganization(OrganizationId),
        this.onboardingService.findAllDevices(OrganizationId),
        this.onboardingService.findAllUsers(OrganizationId),
      ]);

      console.log('Data fetched successfully:');
      console.log('- Teams:', teams?.length || 0);
      console.log('- Devices:', devices?.length || 0);
      console.log('- Users:', users?.length || 0);

      // Check if no teams exist
      if (!teams || !teams.length) {
        console.log('No teams found for organization');
        return res.status(404).json({
          message: 'No team in the organization Please create one!',
          team: [],
          devices: devices || [],
          users: users || [],
        });
      }

      // Process devices to include user information
      const processedDevices = devices
        ? devices.map((device) => {
            const assignedUser = device.user_uid
              ? users.find((user) => user.userUUID === device.user_uid)
              : null;

            return {
              device_uid: device.device_uid,
              device_name: device.device_name,
              user_name: device.user_name,
              user_uid: device.user_uid,
              mac_address: device.mac_address,
              organization_uid: device.organization_uid,
              created_at: device.created_at,
              updated_at: device.updated_at,
              config: device.config,
              // Add user details if assigned
              assignedUser: assignedUser
                ? {
                    userUUID: assignedUser.userUUID,
                    userName: assignedUser.userName,
                    email: assignedUser.email,
                    teamId: assignedUser.teamId,
                  }
                : null,
            };
          })
        : [];

      // Process users to include team information
      const processedUsers = users
        ? users.map((user) => {
            const userTeam = teams.find((team) => team.id === user.teamId);

            return {
              userUUID: user.userUUID,
              userName: user.userName,
              email: user.email,
              teamId: user.teamId,
              organizationId: user.organizationId,
              created_at: user.created_at,
              updated_at: user.updated_at,
              // Add team details
              team: userTeam
                ? {
                    id: userTeam.id,
                    name: userTeam.name,
                    organizationId: userTeam.organizationId,
                  }
                : null,
            };
          })
        : [];

      const responseData = {
        team: teams,
        devices: processedDevices,
        users: processedUsers,
        summary: {
          totalTeams: teams.length,
          totalDevices: processedDevices.length,
          totalUsers: processedUsers.length,
          assignedDevices: processedDevices.filter((device) => device.user_uid)
            .length,
          unassignedDevices: processedDevices.filter(
            (device) => !device.user_uid,
          ).length,
        },
      };

      console.log('Sending response with summary:', responseData.summary);
      return res.status(200).json(responseData);
    } catch (err) {
      console.error('❌ Error in getTeam:', err);
      console.error('Error stack:', err.stack);
      return res.status(500).json({
        message: 'Failed to fetch team data',
        error: err.message,
        team: [],
        devices: [],
        users: [],
      });
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

  // Update your getAllDevices method in OnboardingController

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

    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      const [
        devices,
        users,
        images,
        organization,
        teams,
        userActivities,
        policies,
        lastActive,
        recentActivityData, // Add this new data
      ] = await Promise.all([
        this.onboardingService.findFilteredDevices(OrganizationId), // Use filtered devices
        this.onboardingService.findAllUsers(OrganizationId),
        this.onboardingService.fetchScreenShot(),
        this.onboardingService.fetchAllOrganization(OrganizationId),
        this.onboardingService.getAllTeam(OrganizationId),
        this.onboardingService.getAllUserActivityData(OrganizationId),
        this.onboardingService.getPoliciesForOrganization(OrganizationId),
        this.onboardingService.getLastestActivity(OrganizationId),
        this.onboardingService.getRecentActivityData(OrganizationId), // Add this call
      ]);

      const resolvedPolicies = await Promise.all(
        policies.map(async (pol) =>
          this.onboardingService.getPolicyTeamAndUser(pol.policyId),
        ),
      );

      images?.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      );

      for (const device of devices) {
        device['LatestImage'] = null;
        device['userDetail'] = null;
        device['organizationDetail'] = organization;
        device['teamDetail'] = null;
        device['timeZone'] = organization?.timeZone;
        device['IP_Adress'] = null;
        device['policy'] = null;
        device['lastActive'] = null;

        // Add recent activity data
        const activityData = recentActivityData[device.device_uid] || {
          inTime: '00:00',
          outTime: '00:00',
          activeTime: '00:00',
          status: 'away',
          productivity: '0%',
          lastActiveDate: null,
        };

        device['recentActivity'] = activityData;
        device['deviceStatus'] = activityData.status; // For frontend filtering

        // Assign Latest Image
        const matchingImage = images.find(
          (img) =>
            img.key.split('/')[1].split('|')[1].split('.')[0] ===
            device.device_uid,
        );
        if (matchingImage) {
          device['LatestImage'] = matchingImage;
        }

        device['lastActive'] = lastActive[device?.device_uid];

        // Assign IP Address
        const userActivity = userActivities.find(
          (activity) => activity.user_uid === device.user_uid,
        );

        if (userActivity) {
          device['IP_Adress'] = userActivity.ip_address;
        }

        // Assign Policy
        for (const policy of resolvedPolicies) {
          const isUserAssigned = policy.assignedUsers?.some(
            (userPol) => userPol.user?.userUUID === device.user_uid,
          );
          if (isUserAssigned) {
            device['policy'] = policy.policyName;
            break;
          }
        }

        // Assign User Details
        const userDetail = users.find(
          (user) => user.userUUID === device.user_uid,
        );
        if (userDetail) {
          device['userDetail'] = userDetail;

          // Assign Team Details
          const teamDetail = teams.find(
            (team) => team.id === userDetail.teamId,
          );
          if (teamDetail) {
            device['teamDetail'] = teamDetail;
          }
        }
      }

      console.log(`Final processed devices with recent activity: ${devices.length} devices (filtered to show only devices with user_id or tracking activity)`);
      return res.status(200).json({ devices, organization });
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
      const user = await this.onboardingService.getUserActivityDetails(
        OrganizationId,
        id,
        page,
        Limit,
      );
      const userDetails = await this.onboardingService.getUserDeviceId(id);
      // console.log("userDetails", userDetails);
      const dataCount = await this.onboardingService.getUserDataCount(id);
      console.log(user.length, dataCount);

      return res.status(200).json({ user, dataCount, userDetails });
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
  @Get('/users/AppUsageStatics/:id')
  async getAppUsageStatics(
    @Param('id') userId: string,
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
      const totalActiveTime = await this.onboardingService.getAppUsageStatics(
        OrganizationId,
        userId,
      );

      return res.status(200).json(totalActiveTime);
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
  @Post('/exportTimeSheetData')
  async exportTimeSheetData(
    @Res() res: Response,
    @Req() req: Request,
    @Body()
    exportData: {
      users: string[] | 'all';
      date: string;
      format: 'csv' | 'excel' | 'pdf' | 'txt'; // Make sure 'txt' is included
      userData: any[];
    },
  ): Promise<void | Response> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
        });
      }

      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found!' });
      }

      // Get timesheet data for the specified date
      const userActivityData =
        await this.onboardingService.getAllUserActivityData(OrganizationId);

      const timeSheetData = await this.onboardingService.getTimeSheetData(
        userActivityData,
        exportData.date,
        OrganizationId,
      );

      // Filter data based on selected users
      let filteredData = timeSheetData.daily;
      if (exportData.users !== 'all') {
        filteredData = filteredData.filter((user) =>
          exportData.users.includes(user.id),
        );
      }

      // Generate export based on format
      const exportResult = await this.onboardingService.generateExport(
        filteredData,
        exportData.format,
        exportData.date,
      );

      // Set appropriate headers based on format - UPDATED with proper TXT handling
      const formatConfig = {
        csv: {
          contentType: 'text/csv',
          extension: 'csv',
        },
        excel: {
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: 'xlsx',
        },
        pdf: {
          contentType: 'application/pdf',
          extension: 'pdf',
        },
        txt: {
          contentType: 'text/plain; charset=utf-8', // Enhanced content type
          extension: 'txt',
        },
      };

      const config = formatConfig[exportData.format];
      const fileName = `timesheet_${exportData.date}.${config.extension}`;

      res.set({
        'Content-Type': config.contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      // Handle different format types properly
      if (exportData.format === 'excel' || exportData.format === 'pdf') {
        // For binary formats, send the buffer
        res.send(exportResult);
      } else {
        // For text formats (csv, txt), send as string with proper encoding
        res.send(exportResult);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return res.status(500).json({
        message: 'Failed to export timesheet data',
        error: error.message,
      });
    }
  }
  @Post('exportAttendanceData')
  async exportAttendanceData(
    @Body()
    exportAttendanceDto: {
      users: string[] | 'all';
      startDate: string;
      endDate: string;
      format: 'csv' | 'excel' | 'pdf' | 'txt';
      userData?: any[];
    },
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
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
        throw new BadRequestException('Organization not found');
      }

      const { users, startDate, endDate, format, userData } =
        exportAttendanceDto;

      // Validate required fields
      if (!startDate || !endDate || !format || !users) {
        throw new BadRequestException(
          'Missing required fields: users, startDate, endDate, or format',
        );
      }

      // Validate date format and range
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (start > end) {
        throw new BadRequestException('Start date cannot be after end date');
      }

      // Get attendance data
      const attendanceData =
        await this.onboardingService.getAttendanceExportData(
          OrganizationId,
          startDate,
          endDate,
          users,
          userData,
        );

      if (!attendanceData || attendanceData.length === 0) {
        throw new NotFoundException(
          'No attendance data found for the specified criteria',
        );
      }

      // Generate export file
      const exportResult =
        await this.onboardingService.generateAttendanceExport(
          attendanceData,
          format,
          startDate,
          endDate,
        );

      // Set response headers
      const formatExtensions = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf',
        txt: 'txt',
      };

      const extension = formatExtensions[format];
      const filename = `attendance_report_${startDate}_to_${endDate}.${extension}`;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      if (format === 'csv' || format === 'txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.send(exportResult);
      } else if (format === 'excel') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.send(exportResult);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(exportResult);
      }
    } catch (error) {
      console.error('Error exporting attendance data:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to export attendance data: ${error.message}`,
      );
    }
  }
  @Post('/exportActivityData')
  async exportActivityData(
    @Res() res: Response,
    @Req() req: Request,
    @Body()
    exportData: {
      users: string[] | 'all';
      date: string;
      format: 'csv' | 'excel' | 'pdf' | 'txt';
      userData: any[];
    },
  ): Promise<void | Response> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
        });
      }

      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found!' });
      }

      // Validate required fields
      const { users, date, format, userData } = exportData;

      if (!date || !format || !users) {
        throw new BadRequestException(
          'Missing required fields: users, date, or format',
        );
      }

      // Validate date format
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      // Get activity timeline data
      const activityData =
        await this.onboardingService.getActivityTimelineExportData(
          OrganizationId,
          date,
          users,
          userData,
        );

      if (!activityData || activityData.length === 0) {
        throw new NotFoundException(
          'No activity timeline data found for the specified criteria',
        );
      }

      // Generate export file
      const exportResult =
        await this.onboardingService.generateActivityTimelineExport(
          activityData,
          format,
          date,
        );

      // Set response headers
      const formatExtensions = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf',
        txt: 'txt',
      };

      const extension = formatExtensions[format];
      const filename = `activity_timeline_${date}.${extension}`;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      if (format === 'csv' || format === 'txt') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(exportResult);
      } else if (format === 'excel') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.send(exportResult);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(exportResult);
      }
    } catch (error) {
      console.error('Error exporting activity timeline data:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to export activity timeline data: ${error.message}`,
      );
    }
  }
  @Get('/getProductivityDetails/:userId')
  async getProductivityDetails(
    @Req() req: Request,
    @Res() res: Response,
    @Param('userId') userId: string,
    @Query('from') fromTime: string,
  ): Promise<any> {
    try {
      // Validate the 'from' date
      if (!fromTime || isNaN(Date.parse(fromTime))) {
        return res.status(400).json({
          error: 'Invalid or missing `from` date. Use YYYY-MM-DD format.',
        });
      }

      // Retrieve the organization admin ID from headers
      const organizationAdminId = req.headers['organizationAdminId'] as string;
      if (!organizationAdminId) {
        return res
          .status(400)
          .json({ error: 'Missing organizationAdminId header.' });
      }

      // Find organization by admin ID
      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminId,
        );
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found.' });
      }

      // Validate the user/device
      const requestingUser =
        await this.onboardingService.validateDeviceById(userId);
      if (!requestingUser) {
        return res.status(404).json({ error: 'User or device not found.' });
      }

      // Fetch productivity data from Flask API
      const flaskUrl = `${DeployFlaskBaseApi}/getUserProductivity/${requestingUser.device_uid}`;
      const flaskResponse = await axios.get(flaskUrl, {
        params: { from: fromTime },
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if Flask response is valid
      if (!flaskResponse || !flaskResponse.data) {
        return res.status(500).json({
          error: 'Failed to retrieve data from productivity service.',
        });
      }

      // Return the response from Flask to the frontend

      console.log({ flaskData: flaskResponse.data });

      return res.status(200).json(flaskResponse.data);
    } catch (error) {
      console.error('Error fetching productivity details:', error.message);

      // Handle specific axios errors
      if (axios.isAxiosError(error)) {
        return res.status(error.response?.status || 500).json({
          error:
            error.response?.data ||
            'Error communicating with the productivity service.',
        });
      }

      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  @Get('/getActivitTimeSheetData')
  async ActivityTimeSHeetData(
    @Res() res: Response,
    @Req() req: Request,
    @Query('from') fromTime: string,
  ): Promise<Response> {
    // setp 1:- get the organizationId & from date if not then use the today's date
    const organizationAdminId = req.headers['organizationAdminId'];
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    if (!organizationAdminIdString) {
      return res
        .status(400)
        .json({ message: 'Organization Admin ID is required' });
    }

    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      // step2: gather the data of the userActivity of the organization later on we all separe them with user.
      const userActivityData =
        await this.onboardingService.getAllUserActivityData(OrganizationId);

      // step3: get the user data formated according to teh given data
      const timeSheetData = await this.onboardingService.getTimeSheetData(
        userActivityData,
        fromTime,
        OrganizationId,
      );

      return res.status(200).json({ timeSheetData });
    } catch (error) {
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
    const OrganizationId =
      await this.organizationAdminService.findOrganizationById(
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
      const userToUpdate = await this.onboardingService.validateDeviceById(
        requestingUser?.device_uid,
      );
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
    @Body() body: { user_id?: string; email?: string } = {},
  ): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'] as string;
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    console.log('=== DEVICE ASSIGNMENT REQUEST ===');
    console.log('Device ID:', deviceId);
    console.log('Request Body:', body);
    console.log('Query Params:', req.query);
    console.log('Organization Admin ID:', organizationAdminIdString);

    try {
      // Support both query parameter and body for backward compatibility
      const userId = body?.user_id || (req.query.user_id as string);
      const newEmail = body?.email?.trim();

      console.log('Extracted User ID:', userId);
      console.log('Extracted Email:', newEmail);

      // Validate organization
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      console.log('Organization ID found:', OrganizationId);

      if (!OrganizationId) {
        console.error(
          'Organization not found for admin ID:',
          organizationAdminIdString,
        );
        return res.status(404).json({
          error: 'Organization not found',
          success: false,
        });
      }

      // Validate required parameters
      if (!userId || !deviceId) {
        console.error(
          'Missing required parameters - User ID:',
          userId,
          'Device ID:',
          deviceId,
        );
        return res.status(400).json({
          error: 'Device ID and User ID are required',
          success: false,
        });
      }

      console.log(
        `Attempting to assign device ${deviceId} to user ${userId} in organization ${OrganizationId}`,
      );
      if (newEmail) {
        console.log(`Also updating user email to: ${newEmail}`);
      }

      // Check if device exists and belongs to organization
      const deviceToUpdate =
        await this.onboardingService.validateDeviceById(deviceId);
      console.log('Device found:', deviceToUpdate ? 'Yes' : 'No');

      if (!deviceToUpdate?.device_uid) {
        console.error('Device not found:', deviceId);
        return res.status(404).json({
          message: 'Device not found',
          success: false,
        });
      }

      // Check if device belongs to the organization
      if (deviceToUpdate.organization_uid !== OrganizationId) {
        console.error(
          'Device does not belong to organization:',
          deviceToUpdate.organization_uid,
          'vs',
          OrganizationId,
        );
        return res.status(403).json({
          message: 'Device does not belong to this organization',
          success: false,
        });
      }

      // Check if user exists and belongs to organization
      const userToAssign = await this.onboardingService.findUserById(userId);
      console.log('User found:', userToAssign ? 'Yes' : 'No');

      if (!userToAssign) {
        console.error('User not found:', userId);
        return res.status(404).json({
          message: 'User not found',
          success: false,
        });
      }

      if (userToAssign.organizationId !== OrganizationId) {
        console.error(
          'User does not belong to organization:',
          userToAssign.organizationId,
          'vs',
          OrganizationId,
        );
        return res.status(403).json({
          message: 'User does not belong to this organization',
          success: false,
        });
      }

      // Handle previous user assignment (if any)
      const previousUserId = deviceToUpdate.user_uid;
      if (previousUserId && previousUserId !== userId) {
        console.log(
          `Device ${deviceId} was previously assigned to user ${previousUserId}`,
        );
      }

      // Handle user assignment conflicts (remove user from other devices if needed)
      console.log('Checking for existing user assignments...');
      await this.onboardingService.validateUserIdLinked(userId, deviceId);

      // Update device user assignment
      console.log('Updating device assignment...');
      deviceToUpdate.user_uid = userId;
      const updatedDevice =
        await this.onboardingService.updateDevice(deviceToUpdate);
      console.log('Device updated successfully');

      // Update user email if provided
      let emailUpdated = false;
      let updatedUser = userToAssign;

      if (newEmail && newEmail !== userToAssign.email) {
        console.log('Updating user email...');
        emailUpdated = await this.onboardingService.updateUserEmail(
          userId,
          newEmail,
        );
        if (emailUpdated) {
          updatedUser = await this.onboardingService.findUserById(userId); // Refresh user data
          console.log(
            `Successfully updated user ${userId} email to ${newEmail}`,
          );
        } else {
          console.log('Failed to update user email');
        }
      }

      console.log(
        `✅ Successfully assigned device ${deviceId} to user ${userId}`,
      );

      const responseData = {
        message: 'Device assigned to user successfully',
        success: true,
        data: {
          device: {
            device_uid: updatedDevice.device_uid,
            device_name: updatedDevice.device_name,
            user_uid: updatedDevice.user_uid,
            organization_uid: updatedDevice.organization_uid,
          },
          assignedUser: {
            userUUID: updatedUser.userUUID,
            userName: updatedUser.userName,
            email: updatedUser.email,
            teamId: updatedUser.teamId,
          },
          previousAssignment: previousUserId !== userId ? previousUserId : null,
          emailUpdated: emailUpdated,
          newEmail: emailUpdated ? newEmail : null,
        },
      };

      console.log('Sending response:', responseData);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('❌ Error in updateDeviceUser:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({
        message: 'Failed to assign device to user',
        error: error.message,
        success: false,
      });
    }
  }

  // Also add a method to unassign device from user
  @Patch('/organization/devices/:deviceId/unassign')
  async unassignDeviceUser(
    @Req() req: Request,
    @Res() res: Response,
    @Param('deviceId') deviceId: string,
  ): Promise<any> {
    const organizationAdminId = req.headers['organizationAdminId'] as string;
    const organizationAdminIdString = Array.isArray(organizationAdminId)
      ? organizationAdminId[0]
      : organizationAdminId;

    try {
      const OrganizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!OrganizationId) {
        return res.status(404).json({
          error: 'Organization not found',
          success: false,
        });
      }

      if (!deviceId) {
        return res.status(400).json({
          error: 'Device ID is required',
          success: false,
        });
      }

      const deviceToUpdate =
        await this.onboardingService.validateDeviceById(deviceId);
      if (!deviceToUpdate?.device_uid) {
        return res.status(404).json({
          message: 'Device not found',
          success: false,
        });
      }

      if (deviceToUpdate.organization_uid !== OrganizationId) {
        return res.status(403).json({
          message: 'Device does not belong to this organization',
          success: false,
        });
      }

      const previousUserId = deviceToUpdate.user_uid;
      deviceToUpdate.user_uid = null;

      const updatedDevice =
        await this.onboardingService.updateDevice(deviceToUpdate);

      console.log(
        `Successfully unassigned device ${deviceId} from user ${previousUserId}`,
      );

      return res.status(200).json({
        message: 'Device unassigned successfully',
        success: true,
        data: {
          device: updatedDevice,
          previousUserId: previousUserId,
        },
      });
    } catch (error) {
      console.error('Error in unassignDeviceUser:', error);
      return res.status(500).json({
        message: 'Failed to unassign device',
        error: error.message,
        success: false,
      });
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
    @Body()
    userData: Partial<User & { operatingSystem?: string; fileType?: string }>,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    const data = req.body;
    console.log(userData,"userData")
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

    const organizationId = OrganizationId;
    const teamId = userData?.teamId;
    const operatingSystem = userData?.operatingSystem || 'windows';
    const fileType = userData?.fileType;

    try {
      if (!organizationId || !teamId) {
        return res.status(401).send({
          message: 'Organization or teams are required to create users.',
        });
      }

      // Validate operating system
      const supportedOS = ['windows', 'linux', 'macos'];
      if (!supportedOS.includes(operatingSystem)) {
        return res.status(400).json({
          message: 'Invalid operating system. Supported: windows, linux, macos',
        });
      }

      // For Windows, validate file type
      if (operatingSystem === 'windows' && !fileType) {
        return res.status(400).json({
          message: 'File type is required for Windows installation',
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
        organizationId,
      );
      
      if (!isUserExist?.email) {
        // User doesn't exist in this organization, create new user
        userData['organizationId'] = organizationId;
        isUserExist = await this.userService.registerUser({ ...userData });
        console.log('User registered here...');
      } else {
        // User already exists in this organization, return existing user with installer
        console.log('User already exists in this organization, providing installer with existing config...');
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

      // Always generate full installer package for invite users
      return await this.generateInstallerPackage(
        res,
        operatingSystem,
        fileType,
        organizationId,
        uniqueDeviceCreation,
        userData, // Pass user configuration data
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Failed to register user',
        error: error.message,
      });
    }
  }

  private async generateInstallerPackage(
    res: Response,
    operatingSystem: string,
    fileType: string,
    organizationId: string,
    deviceId: string,
    userConfig?: any,
  ): Promise<any> {
    try {
      const installerBasePath = path.join(
        process.cwd(),
        'src',
        'organisation',
        'Installer',
      );

      const osInstallerPath = path.join(installerBasePath, operatingSystem);

      if (!fs.existsSync(osInstallerPath)) {
        return res.status(404).json({
          error: `Installer not available for ${operatingSystem}`,
        });
      }

      const configFilePath = path.join(osInstallerPath, 'dev_config.txt');

      // Encryption setup
      const key = 'an example very very secret key.';
      const iv = Buffer.alloc(16, 0);

      // Prepare configuration values with actual device ID and user settings
      const configValues = {
        HOST_FOR_NEST:
          'https://deploy-tracktime-nestjs-0kz7.onrender.com/onboarding/users/configStatus',
        HOST_FOR_GO: 'https://go-producer-deploy-zo6h.onrender.com/produce',
        device_id: deviceId,
        token: deviceId,
        timeForUnpaidUser: userConfig?.timeForUnpaidUser || '5',
        organizationId: organizationId,
        version: '1.0.0',
        blurStatus: userConfig?.blurStatus || 'false',
        // Add user-specific configurations
        userType: userConfig?.userType || 'existing', // existing, new, anonymous
        userName: userConfig?.userName || '',
        userEmail: userConfig?.email || '',
        trackTimeStatus: userConfig?.trackTimeStatus || 'Resume',
        isPaid: userConfig?.isPaid || 'false',
      };

      // Encrypt all configuration values
      const encryptedConfig = {
        HOST_FOR_NEST: this.encryptData(configValues.HOST_FOR_NEST, key, iv),
        HOST_FOR_GO: this.encryptData(configValues.HOST_FOR_GO, key, iv),
        device_id: this.encryptData(configValues.device_id, key, iv),
        token: this.encryptData(configValues.token, key, iv),
        timeForUnpaidUser: this.encryptData(
          configValues.timeForUnpaidUser,
          key,
          iv,
        ),
        organizationId: this.encryptData(configValues.organizationId, key, iv),
        version: this.encryptData(configValues.version, key, iv),
        blurStatus: this.encryptData(configValues.blurStatus, key, iv),
        userType: this.encryptData(configValues.userType, key, iv),
        userName: this.encryptData(configValues.userName, key, iv),
        userEmail: this.encryptData(configValues.userEmail, key, iv),
        trackTimeStatus: this.encryptData(configValues.trackTimeStatus, key, iv),
        isPaid: this.encryptData(configValues.isPaid, key, iv),
      };

      // Create the complete configuration content
      const updatedConfig = `organizationId=${encryptedConfig.organizationId}
timeForUnpaidUser=${encryptedConfig.timeForUnpaidUser}
device_id=${encryptedConfig.device_id}
version=${encryptedConfig.version}
HOST_FOR_NEST=${encryptedConfig.HOST_FOR_NEST}
blurStatus=${encryptedConfig.blurStatus}
token=${encryptedConfig.token}
HOST_FOR_GO=${encryptedConfig.HOST_FOR_GO}
userType=${encryptedConfig.userType}
userName=${encryptedConfig.userName}
userEmail=${encryptedConfig.userEmail}
trackTimeStatus=${encryptedConfig.trackTimeStatus}
isPaid=${encryptedConfig.isPaid}`;

      // Write updated config to file
      fs.writeFileSync(configFilePath, updatedConfig);

      // Create zip file
      let zipFileName;
      if (operatingSystem === 'macos') {
        zipFileName = `${organizationId}_macOS_package.zip`;
      } else if (operatingSystem === 'windows') {
        zipFileName = `${organizationId}_Windows_${fileType}_package.zip`;
      } else {
        zipFileName = `${organizationId}_${operatingSystem}_package.zip`;
      }

      const outputZipPath = path.join(installerBasePath, zipFileName);

      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`Archive created: ${archive.pointer()} total bytes`);

          // Send zip file
          res.set({
            'Content-Disposition': `attachment; filename="${zipFileName}"`,
            'Content-Type': 'application/zip',
          });

          res.sendFile(outputZipPath, {}, (err) => {
            if (err) {
              console.error('Error sending file:', err);
              reject(err);
            } else {
              // Clean up
              try {
                fs.unlinkSync(outputZipPath);
                console.log('Zip file cleaned up successfully');
              } catch (unlinkError) {
                console.error('Error deleting zip file:', unlinkError);
              }
              resolve(true);
            }
          });
        });

        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);
        // Add files to archive
        const files = fs.readdirSync(osInstallerPath);
        for (const file of files) {
          const filePath = path.join(osInstallerPath, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            if (operatingSystem === 'macos' && file === 'trackTime') {
              const fileBuffer = fs.readFileSync(filePath);
              archive.append(fileBuffer, {
                name: file,
                mode: 0o755,
              });
            } else {
              const fileBuffer = fs.readFileSync(filePath);
              archive.append(fileBuffer, { name: file });
            }
          } else if (stats.isDirectory()) {
            archive.directory(filePath, file);
          }
        }

        archive.finalize();
      });
    } catch (error) {
      console.error('Error generating installer package:', error);
      return res.status(500).json({
        message: 'Failed to generate installer package',
        error: error.message,
      });
    }
  }

  private encryptData(data: string, key: string, iv: Buffer): string {
    const keyBuffer = Buffer.from(key, 'utf-8');
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer as any, iv as any);
    let encrypted = cipher.update(data.toString(), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  @Post('users/configStatus')
  async getConfig(
    @Headers('device-id') deviceId: string,
    @Body('organizationId') organizationId: string,
    @Body('mac_address') macAddress: string,
    @Body('device_user_name') username: string,
    @Res() res,
  ): Promise<any> {
    this.logger.debug(
      `Received request for device config: ${deviceId}, ${username}, ${macAddress}, ${organizationId}`,
    );

    // Validate required fields
    if (!macAddress || !organizationId || !username) {
      this.logger.warn('Validation failed: Missing required fields');
      throw new HttpException( 
        'All fields are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Step 1: Validate Organization
      const organizationExists =
        await this.onboardingService.validateOrganization(organizationId);
      if (!organizationExists) {
        this.logger.warn(
          `Organization with ID ${organizationId} does not exist.`,
        );
        throw new HttpException(
          'Organization with provided ID does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      // Step 2: Check if Device Exists
      // Clean the deviceId - convert empty string to null
      const cleanDeviceId =
        deviceId && deviceId.trim() !== '' ? deviceId : null;

      const deviceExist = cleanDeviceId
        ? await this.onboardingService.checkDeviceIdExistWithDeviceId(
            macAddress,
            cleanDeviceId,
            username,
          )
        : await this.onboardingService.checkDeviceIdExist(macAddress, username);

      let deviceIdOrNew: string = deviceExist;
      this.logger.log(
        `Device existence check complete. Result: ${deviceExist}`,
      );

      // Step 3: Create New Device if Not Exists
      if (!deviceExist) {
        this.logger.log(`Creating new device for user: ${username}`);
        deviceIdOrNew = await this.onboardingService.createDeviceForUser(
          organizationId,
          username,
          '', // email - will be converted to null in the service
          '', // user_uid - will be converted to null in the service
          macAddress,
        );
      }

      // Step 4: Retrieve User Config
      let userConfig = await this.onboardingService.getUserConfig(
        deviceIdOrNew,
        organizationId,
      );
       console.log('userConfig', userConfig);

      if (!userConfig) {
        // this.logger.warn('User configuration not found');
        userConfig = {
          "isPaid": false,
          "trackTimeStatus": "Resume"
        }; // temeprory fix
        // return res
        //   .status(404)
        //   .json({ message: 'User configuration not found' });
      }

      // Step 5: Getting Paid status for the organization
      const isPaidStatus = await this.onboardingService.finalResponseData(
        userConfig.config?.trackTimeStatus,
        deviceIdOrNew,
        organizationId,
      );

      const timeForUnPaidUsers =
        await this.onboardingService.findTimeForPaidUsers(deviceIdOrNew);

      const blurStatus =
        await this.onboardingService.findBlurScreenshotStatus(deviceIdOrNew);

      const finalData = {
        device_id: deviceIdOrNew,
        timeForUnpaidUser: timeForUnPaidUsers || 2,
        blurstatus: blurStatus || false,
        config: {
          trackTimeStatus:
            userConfig?.config?.trackTimeStatus || TrackTimeStatus.Resume,
          isPaid: isPaidStatus,
        },
      };
 
      this.logger.log(`FinalData ${JSON.stringify(finalData)}`);
      return res.status(200).json(finalData);
    } catch (error) {
      this.logger.error(
        `Failed to fetch user config: ${error.message}`,
        error.stack,
      );
      return res
        .status(500)
        .json({ message: 'Failed to fetch user config', error: error.message });
    }
  }

  @Get('/hourly')
  async getHourlyProductivity(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
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

      const date = req.query.date as string;
      const dateString = Array.isArray(date)
        ? date[0]
        : date || new Date().toISOString().split('T')[0];

      const data = await this.onboardingService.getProductivityData(
        OrganizationId,
        dateString,
      );
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to fetch productivity data',
        error: error.message,
      });
    }
  }
  
  @Get('/users-for-download')
  async getUsersForDownload(@Req() req: Request, @Res() res: Response) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;
      
        // Retrieve organization details
      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );
  

      if (!organization) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const users = await this.onboardingService.getUsersForDownload(organization);
      
      return res.json({
        success: true,
        users: users
      });
    } catch (error) {
      this.logger.error('Error fetching users for download:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
  
  @Get('/downloadApplication')
  async downloadApplication(@Res() res, @Req() req: Request) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;
  
      // Retrieve organization details
      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );
  
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
  
      const { os, userType, userName, userEmail, organizationId } = req.query;
  
      // Validate OS parameter
      const supportedOS = ['windows', 'linux', 'macos'];
      if (!os || !supportedOS.includes(os as string)) {
        return res.status(400).json({
          error:
            'Invalid or missing OS parameter. Supported values: windows, linux, macos',
        });
      }
  
      const selectedOS = os as string;
  
      this.logger.log(`Processing download for OS: ${selectedOS}, UserType: ${userType}`);

      // Handle different user types
      let deviceId = 'null';
      let userId = 'null';
      let finalUserName = 'anonymous';

      if (userType === 'existing' && userName) {
        // For existing user, find the user by email (extracted from display name)
        const userDisplayName = decodeURIComponent(userName as string);
        console.log('Processing existing user:', userDisplayName);
        
        // Extract email from display name format: "(email) - Status"
        const emailMatch = userDisplayName.match(/\(([^)]+)\)/);
        if (emailMatch) {
          const userEmail = emailMatch[1];
          console.log('Extracted email:', userEmail);
          
          try {
            const user = await this.onboardingService.findUserByEmail(userEmail, organization);
            if (user) {
              userId = user.userUUID;
              finalUserName = user.userName || user.email || 'existing_user';
              
              // Find user's device
              const userDevice = await this.onboardingService.findDeviceByUserId(userId, organization);
              if (userDevice) {
                deviceId = userDevice.device_uid;
              }
            } else {
              this.logger.warn(`User not found for email: ${userEmail} in organization: ${organization}`);
              return res.status(404).json({ error: `User not found for email: ${userEmail}` });
            }
          } catch (error) {
            this.logger.error('Error finding existing user:', error);
            return res.status(500).json({ error: 'Failed to find existing user' });
          }
        } else {
          this.logger.warn(`Invalid user display name format: ${userDisplayName}`);
          return res.status(400).json({ error: 'Invalid user display name format' });
        }
      } else if (userType === 'new' && userName && userEmail) {
        // Create new user and device
        try {
          const newUser = await this.onboardingService.createUser({
            user_name: userName as string,
            email: userEmail as string,
            organizationId: organization,
            trackTimeStatus: TrackTimeStatus.Resume,
          });
          
          if (newUser) {
            userId = newUser.userUUID;
            finalUserName = userName as string;
            
            // Create device for new user
            const newDevice = await this.onboardingService.createDevice({
              device_name: `${userName}_device`,
              user_uid: userId,
              organization_uid: organization,
              user_name: userName as string,
            });
            
            if (newDevice) {
              deviceId = newDevice.device_uid;
            }
          }
        } catch (error) {
          this.logger.error('Error creating new user/device:', error);
          return res.status(500).json({ error: 'Failed to create new user and device' });
        }
      } else if (userType === 'anonymous') {
        // Create anonymous device only
        try {
          const anonymousDevice = await this.onboardingService.createDevice({
            device_name: 'anonymous_device',
            user_uid: null, // No user assigned
            organization_uid: organization,
            user_name: 'anonymous_user',
          });
          
          if (anonymousDevice) {
            deviceId = anonymousDevice.device_uid;
            finalUserName = 'anonymous';
          }
        } catch (error) {
          this.logger.error('Error creating anonymous device:', error);
          return res.status(500).json({ error: 'Failed to create anonymous device' });
        }
      }

      this.logger.log(`Device ID: ${deviceId}, User ID: ${userId}, User Name: ${finalUserName}`);
  
      // Get the appropriate installer path
      const installerBasePath = path.join(
        process.cwd(),
        'src',
        'organisation',
        'Installer',
      );
  
      const osInstallerPath = path.join(installerBasePath, selectedOS);
  
      // Check if OS folder exists
      if (!fs.existsSync(osInstallerPath)) {
        return res.status(404).json({
          error: `Installer not available for ${selectedOS}`,
        });
      }
  
      // Encryption setup
      const key = 'an example very very secret key.';
      const iv = Buffer.alloc(16, 0);
  
      // Prepare configuration values
      const orgId = typeof organization === 'string' 
        ? organization 
        : ((organization as any)._id?.toString() || (organization as any).toString());
      
      // Get user-specific settings based on user type
      let blurStatus = 'false';
      let trackTimeStatus = 'Resume';
      let isPaid = 'false';

      if (userType === 'existing' && userName) {
        // For existing user, get their actual settings using the userId we already found
        if (userId && userId !== 'null') {
          const user = await this.onboardingService.findUserByUuid(userId, organization);
          if (user && user.config) {
            trackTimeStatus = user.config.trackTimeStatus || 'Resume';
          }
        }
        // Get blur status from user's device/policy
        blurStatus = 'false'; // Default, can be enhanced later
        isPaid = 'false'; // Default, can be enhanced later
      } else if (userType === 'new') {
        // For new user, use default settings
        blurStatus = 'false';
        trackTimeStatus = 'Resume';
        isPaid = 'false';
      } else if (userType === 'anonymous') {
        // For anonymous user, use default settings
        blurStatus = 'false';
        trackTimeStatus = 'Resume';
        isPaid = 'false';
      }
      
      const configValues = {
        HOST_FOR_NEST: 'https://deploy-tracktime-nestjs-0kz7.onrender.com/onboarding/users/configStatus',
        HOST_FOR_GO: 'https://go-producer-deploy-zo6h.onrender.com/produce',
        device_id: deviceId,
        token: userId,
        timeForUnpaidUser: '5',
        organizationId: orgId,
        version: '1.0.0',
        blurStatus: blurStatus,
        trackTimeStatus: trackTimeStatus,
        isPaid: isPaid,
        user_name: finalUserName,
      };
  
      // Encrypt all configuration values
      const encryptedConfig = {
        HOST_FOR_NEST: this.encryptData(configValues.HOST_FOR_NEST, key, iv),
        HOST_FOR_GO: this.encryptData(configValues.HOST_FOR_GO, key, iv),
        device_id: this.encryptData(configValues.device_id, key, iv),
        token: this.encryptData(configValues.token, key, iv),
        timeForUnpaidUser: this.encryptData(
          configValues.timeForUnpaidUser,
          key, iv,
        ),
        organizationId: this.encryptData(configValues.organizationId, key, iv),
        version: this.encryptData(configValues.version, key, iv),
        blurStatus: this.encryptData(configValues.blurStatus, key, iv),
        trackTimeStatus: this.encryptData(configValues.trackTimeStatus, key, iv),
        isPaid: this.encryptData(configValues.isPaid, key, iv),
        user_name: this.encryptData(configValues.user_name, key, iv),
      };
  
      // Create the complete configuration content
      const updatedConfig = `organizationId=${encryptedConfig.organizationId}
  timeForUnpaidUser=${encryptedConfig.timeForUnpaidUser}
  device_id=${encryptedConfig.device_id}
  version=${encryptedConfig.version}
  HOST_FOR_NEST=${encryptedConfig.HOST_FOR_NEST}
  blurStatus=${encryptedConfig.blurStatus}
trackTimeStatus=${encryptedConfig.trackTimeStatus}
isPaid=${encryptedConfig.isPaid}
  token=${encryptedConfig.token}
HOST_FOR_GO=${encryptedConfig.HOST_FOR_GO}
user_name=${encryptedConfig.user_name}`;
  
      this.logger.log(`Config prepared successfully for ${selectedOS}`);
  
      // --- PLATFORM-SPECIFIC PACKAGING LOGIC ---
      if (selectedOS === 'windows') {
        return await this.handleWindowsInstallerWithAdmZip(
          res, 
          organization, 
          osInstallerPath, 
          installerBasePath, 
          updatedConfig
        );
      } else {
        // Keep your existing macOS and Linux zip logic
        return await this.handleZipPackage(
          res, 
          organization, 
          selectedOS, 
          osInstallerPath, 
          installerBasePath,
          updatedConfig
        );
      }
  
    } catch (error) {
      this.logger.error('General error in downloadApplication:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to download the application!',
        error: error.message,
      });
    }
  }

  private async handleWindowsInstallerWithAdmZip(
    res: Response,
    organization: any,
    osInstallerPath: string,
    installerBasePath: string,
    updatedConfig: string
  ) {
    try {
      const orgName = organization.name || organization._id?.toString() || organization.toString();
      this.logger.log(`Creating custom Windows installer for organization: ${orgName}`);
  
      // 1. Define paths
      const installerExePath = path.join(osInstallerPath, 'tracktimeInstaller.exe');
      const customizedInstallerName = `${orgName}_tracktime_setup.zip`;
      const customizedInstallerPath = path.join(installerBasePath, customizedInstallerName);

      // 2. Check if installer exists
      if (!fs.existsSync(installerExePath)) {
        this.logger.error(`Installer not found at: ${installerExePath}`);
        return res.status(404).json({ 
          error: 'Windows installer not found on server.' 
        });
      }

      // 3. Create a new ZIP package containing the installer and config
      const zip = new AdmZip();

      // 4. Add the installer to the ZIP
      zip.addLocalFile(installerExePath, '', 'tracktimeInstaller.exe');

      // 5. Add the customized config file
      zip.addFile('dev_config.txt', Buffer.from(updatedConfig, 'utf8'));

      // 6. Add a README file with installation instructions
      const readmeContent = `TrackTime Desktop Application Setup

Installation Instructions:
1. Extract this ZIP file to a folder on your computer
2. Run 'tracktimeInstaller.exe' as Administrator
3. Follow the installation wizard
4. The application will be configured automatically with your organization settings

Configuration:
- Organization: ${orgName}
- Device ID: Configured automatically
- User: Configured automatically

For support, contact your system administrator.

Generated on: ${new Date().toISOString()}`;

      zip.addFile('README.txt', Buffer.from(readmeContent, 'utf8'));

      // 7. Save the ZIP package
      zip.writeZip(customizedInstallerPath);
      this.logger.log(`Customized installer package created: ${customizedInstallerName}`);
  
      // 8. Send the ZIP file to the user
      res.set({
        'Content-Disposition': `attachment; filename="${customizedInstallerName}"`,
        'Content-Type': 'application/zip',
        'Content-Length': fs.statSync(customizedInstallerPath).size.toString(),
      });
  
      // 9. Send file and clean up temporary file
      res.status(HttpStatus.OK).sendFile(customizedInstallerPath, {}, async (err) => {
        // Cleanup: Delete the temporary customized installer
        try {
          if (fs.existsSync(customizedInstallerPath)) {
            fs.unlinkSync(customizedInstallerPath);
            this.logger.log('Temporary installer cleaned up successfully.');
          }
        } catch (cleanupError) {
          this.logger.error('Cleanup error:', cleanupError);
        }
      });
  
    } catch (error) {
      this.logger.error('Error creating custom Windows installer:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to create customized Windows installer',
        error: error.message,
      });
    }
  }

  private async handleZipPackage(
    res: Response,
    organization: any,
    selectedOS: string,
    osInstallerPath: string,
    installerBasePath: string,
    updatedConfig: string,
  ): Promise<any> {
    try {
      const orgName = organization.name || organization._id?.toString() || organization.toString();
      this.logger.log(`Creating ${selectedOS} installer package for organization: ${orgName}`);
  
      // Update the config file in the OS-specific directory
      const configFilePath = path.join(osInstallerPath, 'dev_config.txt');
      
      if (!fs.existsSync(configFilePath)) {
        this.logger.error(`Config file not found at: ${configFilePath}`);
        return res.status(404).json({
          error: `Configuration file not found for ${selectedOS}`,
        });
      }
  
      // Write updated config to file
      fs.writeFileSync(configFilePath, updatedConfig);
      this.logger.log(`Config file updated at: ${configFilePath}`);
  
      // Create zip file
      let zipFileName;
      if (selectedOS === 'macos') {
        zipFileName = `${orgName}_macOS_package.zip`;
      } else if (selectedOS === 'linux') {
        zipFileName = `${orgName}_Linux_package.zip`;
      } else {
        zipFileName = `${orgName}_${selectedOS}_package.zip`;
      }
  
      const outputZipPath = path.join(installerBasePath, zipFileName);
  
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
  
        output.on('close', () => {
          this.logger.log(`Archive created: ${archive.pointer()} total bytes`);
  
          // Send zip file
          res.set({
            'Content-Disposition': `attachment; filename="${zipFileName}"`,
            'Content-Type': 'application/zip',
          });
  
          res.sendFile(outputZipPath, {}, (err) => {
            if (err) {
              this.logger.error('Error sending file:', err);
              reject(err);
            } else {
              // Clean up
              try {
                fs.unlinkSync(outputZipPath);
                this.logger.log('Zip file cleaned up successfully');
              } catch (unlinkError) {
                this.logger.error('Error deleting zip file:', unlinkError);
              }
              resolve(true);
            }
          });
        });
  
        output.on('error', (err) => {
          this.logger.error('Output stream error:', err);
          reject(err);
        });
        
        archive.on('error', (err) => {
          this.logger.error('Archive error:', err);
          reject(err);
        });
  
        archive.pipe(output);
        
        // Add files to archive
        const files = fs.readdirSync(osInstallerPath);
        for (const file of files) {
          const filePath = path.join(osInstallerPath, file);
          const stats = fs.statSync(filePath);
  
          if (stats.isFile()) {
            // For macOS executable, preserve permissions
            if (selectedOS === 'macos' && (file === 'trackTime' || file.endsWith('.app'))) {
              const fileBuffer = fs.readFileSync(filePath);
              archive.append(fileBuffer, {
                name: file,
                mode: 0o755,
              });
            } else {
              const fileBuffer = fs.readFileSync(filePath);
              archive.append(fileBuffer, { name: file });
            }
          } else if (stats.isDirectory()) {
            archive.directory(filePath, file);
          }
        }
  
        archive.finalize();
      });
    } catch (error) {
      this.logger.error(`Error generating ${selectedOS} installer package:`, error);
      return res.status(500).json({
        message: `Failed to generate ${selectedOS} installer package`,
        error: error.message,
      });
    }
  }

  @Post('/organization/calculatedLogic')
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

      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      console.log(organization);
      const calculatedLogic =
        await this.onboardingService.createCalculatedLogic(body, organization);

      return res.status(201).json({
        calculatedLogic,
        message: 'Caculated logic successfully created.',
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to create Calculated Logic',
        error: error?.message,
      });
    }
  }

  @Get('/api/getOrganizationDetial')
  async getOrganizationDetail(
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
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
      const organization =
        await this.onboardingService.getOrganizationDetails(OrganizationId);
      return res.status(200).json(organization);
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to fetch organization data',
        error: error.message,
      });
    }
  }

  @Get('/calculatedLogic')
  async getCalculatedLogic(@Res() res: Response, @Req() req: Request) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      const calculatedLogic =
        await this.onboardingService.getCalculatedLogic(organization);

      // Map the database response to match frontend expectations
      const response = {
        full_day_active_time: calculatedLogic?.full_day_active_time,
        full_day_core_productive_time:
          calculatedLogic?.full_day_core_productive_time,
        full_day_productive_time: calculatedLogic?.full_day_productive_time,
        full_day_idle_productive_time:
          calculatedLogic?.full_day_idle_productive_time,
        half_day_active_time: calculatedLogic?.half_day_active_time,
        half_day_core_productive_time:
          calculatedLogic?.half_day_core_productive_time,
        half_day_productive_time: calculatedLogic?.half_day_productive_time,
        half_day_idle_productive_time:
          calculatedLogic?.half_day_idle_productive_time,
        timesheetCalculationLogic:
          calculatedLogic?.timesheet_calculation_logic ||
          'coreProductivePlusProductive', // Add this line
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to fetch calculated logic',
        error: error.message,
      });
    }
  }
  @Post('organization/sendTeamInvite')
  async sendTeamInviteEmail(
    @Body() body: { email: string; teamId: string; inviteUrl: string },
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      if (!organizationAdminIdString) {
        return res.status(400).json({
          message: 'Organization Admin ID is required',
        });
      }

      const organizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organizationId) {
        return res.status(404).json({
          error: 'Organization not found',
        });
      }

      const { email, teamId, inviteUrl } = body;

      if (!email || !teamId || !inviteUrl) {
        return res.status(400).json({
          message: 'Email, team ID, and invite URL are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: 'Invalid email format',
        });
      }

      const emailSent = await this.onboardingService.sendTeamInviteEmail(
        email,
        teamId,
        organizationId,
        inviteUrl,
      );

      if (emailSent) {
        return res.status(200).json({
          message: 'Invitation email sent successfully!',
          success: true,
        });
      } else {
        return res.status(500).json({
          message: 'Failed to send email. Please try again.',
          success: false,
        });
      }
    } catch (error) {
      console.error('Send invite email error:', error);
      return res.status(500).json({
        message: 'Failed to send invitation email',
        error: error.message,
        success: false,
      });
    }
  }
  @Delete('/policy/delete/:policy_id')
  async deletePolicy(
    @Res() res: Response,
    @Req() req: Request,
    @Param('policy_id') policyId: string,
  ): Promise<Response> {
    // Step 2: Delete related Screenshot Settings, Weekdays, Holidays, and other related entities
    // You can use cascading delete here if your entities are set up with cascade: true on relations
    // If cascade delete is not enabled, manually delete related records as follows:
    await this.onboardingService.deletePolicy(policyId);

    // Step 4: Return success response
    return res.status(HttpStatus.OK).json({
      message: 'Policy deleted successfully along with all related data.',
    });
  }

  @Patch('/api/updateOrganizationSettings')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './images', // Directory to save the uploaded file
        filename: (req, file, cb) => {
          const uniqueSuffix = `${req.body.organizationId || 'unknown'}-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
    }),
  )
  async updateOrganizationSettings(
    @UploadedFile() logo: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<Response> {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      // console.log("organizationAdmin: " + organizationAdminId)
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const organizationId =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );
      // console.log("organizationId: ", organizationId)
      // console.log("organizationAdminId: ", organizationAdminId)
      if (!organizationId) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }

      let updateData = { ...body };
      console.log('logo', logo);
      if (logo) {
        const logoPath = `/images/${logo.filename}`;
        updateData.logo = logoPath; // Save the path of the logo in the database
        console.log('logoPath', logoPath);
      }

      const organization =
        await this.onboardingService.getOrganizationDetails(organizationId);
      const updateOrganization =
        await this.onboardingService.updateOrganization(
          organization,
          updateData,
        );

      if (!updateOrganization) {
        return res.status(304).json({
          message: 'Not able to update organization data. Please try again.!😢',
        });
      }

      return res.status(200).json({
        message: 'Organization updated successfully!!',
        organization: updateOrganization,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to update organization data',
        error: error.message,
      });
    }
  }

  // Route to create a new policy
  @Post('policy/create')
  async createPolicy(
    @Body() createPolicyDto: TrackingPolicyDTO,
    @Res() res,
    @Req() req,
  ) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      createPolicyDto.organizationId = organization; // Pass organization ID
      const newPolicy =
        await this.onboardingService.createPolicy(createPolicyDto);

      return res
        .status(201)
        .json({ message: 'Policy created successfully!', policy: newPolicy });
    } catch (error) {
      console.error('Policy creation failed', error);
      return res
        .status(500)
        .json({ message: 'Failed to create policy', error: error.message });
    }
  }

  // Route to update a policy
  @Patch('policy/update/:id')
  async updatePolicy(
    @Param('id') policyId: string,
    @Body() updatePolicyDto: TrackingPolicyDTO,
    @Res() res,
    @Req() req,
  ) {
    try {
      const token = req?.headers['authorization'];
      if (!token) {
        return res.status(404).json({ error: 'Token is missing!' });
      }

      const validToken = await this.organizationAdminService.IsValidateToken(
        token.split(' ')[1],
      );
      if (!validToken) {
        return res.status(401).json({ error: 'Invalid User!' });
      }

      const updatedPolicy = await this.onboardingService.updatePolicy(
        policyId,
        updatePolicyDto,
      );
      return res.status(200).json({
        message: 'Policy updated successfully!',
        policy: updatedPolicy,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: 'Failed to update policy!', error: error?.message });
    }
  }

  // Route to get all policies for an organization
  @Get('organization/policies')
  async getPoliciesForOrganization(
    //  @Param('organizationId') organizationId: string,
    @Res() res,
    @Req() req,
  ) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      // console.log("organization on policy page",organization);
      const policies =
        await this.onboardingService.getPoliciesForOrganization(organization);

      const getOtherDetailsForPolicy =
        await this.onboardingService.getDetailsForPolicy(policies);

      console.log('Policies', getOtherDetailsForPolicy);
      return res.status(200).json({ getOtherDetailsForPolicy });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: 'Failed to fetch policies!', error: error?.message });
    }
  }

  @Post('organization/duplicatePolicy')
  async duplicatePolicy(@Body() Body, @Res() res, @Req() req) {
    try {
      const organizationAdminId = req.headers['organizationAdminId'];
      const organizationAdminIdString = Array.isArray(organizationAdminId)
        ? organizationAdminId[0]
        : organizationAdminId;

      const organization =
        await this.organizationAdminService.findOrganizationById(
          organizationAdminIdString,
        );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found !!' });
      }
      console.log(organization);

      //  createPolicyDto["organizationId"] = organization;

      let { policyId, teamId, name } = Body;
      const newPolicy = await this.onboardingService.duplicatePolicy(
        policyId,
        name,
        teamId,
      );

      return res
        .status(201)
        .json({ message: 'Policy created successfully!', policy: newPolicy });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: 'Failed to create policy!', error: error?.message });
    }
  }

  // Route to get a single policy by ID
  @Get('policy/:id')
  async getPolicyById(@Param('id') policyId: string, @Res() res) {
    try {
      const policy = await this.onboardingService.getPolicyById(policyId);
      return res.status(200).json({ policy });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch policy!', error: error?.message });
    }
  }

  // Route to get a single policy by ID
  @Get('policy/t&u/:id')
  async getPolicyTeamAndUser(@Param('id') policyId: string, @Res() res) {
    try {
      console.log('Id', policyId);
      const policy =
        await this.onboardingService.getPolicyTeamAndUser(policyId);
      //  if(policy) {

      //  }
      const teams = await this.onboardingService.getAllTeam(
        policy?.organization?.id,
      );
      const users = await this.onboardingService.getAllusers(
        policy?.organization?.id,
      );

      // const combineData = teams.map(async team=>{
      //   team['teamMembers'] = [];
      //   const teamMember =
      // })

      return res.status(200).json({ policy, teams, users });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch policy!', error: error?.message });
    }
  }

  // Route to get a single policy by ID
  @Patch('policy/assignedPolicy/:id')
  async assignedPolicy(
    @Param('id') policyId: string,
    @Res() res,
    @Body() body,
  ) {
    try {
      console.log('Id', policyId);
      const { teamId, userId } = body;
      console.log(teamId, userId, body);

      const policy = await this.onboardingService.updatePolicyUserAndTeam(
        policyId,
        teamId,
        userId,
      );

      return res.status(200).json({ policy });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to fetch policy!', error: error?.message });
    }
  }

  @Patch('policy/screenShotSettingsUpdate/:id')
  async updateScreenshot(
    @Param('id') policyId: string,
    @Res() res,
    @Body() body,
  ) {
    try {
      console.log('Id', policyId);
      const {
        blurScreenshotsStatus,
        time_interval,
        screenshot_monitoring,
        screenshot_id,
      } = body;
      console.log(
        blurScreenshotsStatus,
        time_interval,
        screenshot_monitoring,
        screenshot_id,
        policyId,
      );
      const screenshotSettings =
        await this.onboardingService.updateScreenShotSettings(
          policyId,
          screenshot_id,
          blurScreenshotsStatus,
          time_interval,
          screenshot_monitoring,
        );
      return res.status(200).json({ screenshotSettings });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to update screenshot!',
        error: error?.message,
      });
    }
  }
}
