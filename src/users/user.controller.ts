// user.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  Req,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TrackTimeStatus, User } from './user.entity';
import { PaidUser } from './paid_users.entity';
import { AuthMiddleware } from './auth.middleware';
import * as path from 'path';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('auth')

export class UserController {

  constructor(private readonly userService: AuthService) {}

  @Post('register')
  async registerUser(
    @Body() userData: Partial<User>,
    @Res() res,
    @Req() req,
  ): Promise<any> {
    const isAdmin = userData.isAdmin !== undefined ? userData.isAdmin : false;
    const organizationId = req?.headers["organizationId"] 
    
    try { 
      // Default config for new users
      const defaultConfig = {
        trackTimeStatus: TrackTimeStatus.Resume,
        // Add other config properties as needed
      };

      const newUser = await this.userService.registerUser({
        ...userData,
        isAdmin,
        organizationUUID:organizationId,
        config: defaultConfig,
      });
      console.log(newUser);

      res.set('user-id', newUser.userUUID);
      return res
        .status(200)
        .json({ message: 'User registered successfully', user: newUser });
      // return { message: 'User registered successfully', user: newUser };
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to register user',
        error: error?.message,
      });
    }
  }
  // @UseGuards(AuthMiddleware)
  @Post('mark-as-paid')
  async markAsPaid(@Req() req, @Res() res): Promise<any> {
    const userId = req.headers['user-id'];
    console.log(userId);

    try {
      const user = await this.userService.validateUserById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isPaid = await this.userService.isUserPaid(userId);
      
      console.log(isPaid);

      if (!isPaid) {
        return res
          .status(400)
          .json({ message: 'User is already marked as paid' });
      }
      // Create a PaidUser entry for the user
      const paidUserData: Partial<PaidUser> = {
        user_id: user.userUUID, // Assuming 'id' is the primary key of the User entity
        username: user.userName, // or other relevant field from the User entity
      };

      await this.userService.markUserAsPaid(paidUserData);

      return res
        .status(200)
        .json({ message: 'User marked as paid successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Failed to mark user as paid' });
    }
  }
  // @UseGuards(AuthMiddleware)
  @Get('/api/config')
  async getConfig(@Req() req, @Res() res): Promise<any> {
    const userId = req.headers['user-id']; // Extract user ID from headers

    try {
      // Retrieve user config and track time status based on user ID
      const userConfig = await this.userService.getUserConfig(userId);

      if (!userConfig) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isPaidUser = await this.userService.isUserPaid(userId);
      // Construct response with user's config and track time status
      const response = {
        config: {
          trackTimeStatus: userConfig.trackTimeStatus,
          isPaid: !isPaidUser,
          // Other user-specific config details here
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch user config' });
    }
  }

  @Post('create-admin')
  async createAdmin(@Body() adminData: Partial<User>): Promise<any> {
    try {
      const adminUser = await this.userService.createAdminUser(adminData);
      return { message: 'Admin user created successfully', user: adminUser };
    } catch (error) {
      return { message: 'Failed to create admin user' };
    }
  }

  @UseGuards(AuthMiddleware)
  @Post('login')
  async login(
    @Body() loginData: { email: string; password: string },
    @Res() res,
  ) {
    const user = await this.userService.validateUser(
      loginData.email,
      loginData.password,
    );
    if (!user) {
      return res.status(500).json({ message: 'Invalid credentials' });
    }
    res.set('user-id', user?.userUUID);
    const token = await this.userService.login(user);
    return res
      .status(200)
      .json({ msg: 'Login Succesfully!!', access_token: token });
  }

  // @Get('updates/latest')
  // async getLatestUpdate(@Res() res: Response) {
  //     const filePath = path.resolve(__dirname, '../update/trackTime.exe');
  //     res.sendFile(filePath);
  // }
  @Get('version')
  getServerVersion(@Res() res: Response): any {
    try {
      const serverVersion = '1.0.1'; // Replace with the actual version
      return res.status(200).json({ version: serverVersion });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to retrieve server version' });
    }
  }

  @Get('download')
  downloadUpdatedFile(@Res() res: Response): any {
    console.log(path.resolve(__dirname, '..',"..","src",'update', 'trackTime.exe'));
    try {
      const file = path.resolve(__dirname, '..',"..","src",'update', 'trackTime.exe');
      const fileName = 'updated_app.exe'; // Replace with the actual file name

      res.download(file, fileName, (err) => {
        if (err) {
          return res
            .status(500)
            .json({
              message: 'Failed to download the updated file',
              error: err.message,
            });
        } 
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to serve the updated file' });
    }
  }

@Get('organization/users')
@UseGuards(AuthMiddleware)
async getOrganizationUsers(@Req() req, @Res() res): Promise<any> {
    // Extract user ID and organization ID from request headers
    const userId = req.headers['user-id'];
    const organizationId = req.headers['organization-id']; // Assuming organization ID is passed in headers

    console.log(userId,organizationId);
    try {
        // Validate the user ID and check if the user is an admin of the requested organization
        const requestingUser = await this.userService.validateUserById(userId);

        if (!requestingUser) {
            return res.status(404).json({ message: 'Requesting user not found' });
        }

        if (!requestingUser.isAdmin || requestingUser.organizationUUID !== organizationId) {
            return res.status(403).json({ message: 'Unauthorized: Access is restricted to admins of the specified organization' });
        }

        // Fetch and return data of all users within the specified organization
        const usersInOrganization = await this.userService.getUsersByOrganization(organizationId);

        return res.status(200).json({ message: 'Organization users fetched successfully', users: usersInOrganization });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch organization users', error: error?.message });
    }
}

}
