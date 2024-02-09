import { Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { Organization } from './organisation.entity';
import { DesktopApplication } from './desktop.entity';
import { Team } from './team.entity';
import { CreateOrganizationDto } from './dto/organization.dto';
import { CreateDesktopApplicationDto } from './dto/desktop.dto';
import { CreateTeamDto } from './dto/team.dto';
import { Response } from 'express';
import { AuthService } from 'src/users/auth.service';


@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly userService: AuthService
    ) {}

  @Post('organization')
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.onboardingService.createOrganization(createOrganizationDto);
  }

  @Post('desktop-application') 
  async createDesktopApplication(
    @Body() createDesktopApplicationDto: CreateDesktopApplicationDto,
  ): Promise<DesktopApplication> {
    return this.onboardingService.createDesktopApplication(createDesktopApplicationDto);
  }

  @Post('team')
  async createTeam(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return this.onboardingService.createTeam(createTeamDto);
  }
  
  @Get('organization/users')
  async getAllUsers(@Res() res: Response): Promise<Response> {
    try {
      const users = await this.onboardingService.findAllUsers();
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
  }
  
  @Get('organization/users/:id')
  async getUserDetails(@Param('id') id: string, @Res() res: Response): Promise<Response> {
    try {
      const user = await this.onboardingService.getUserDetails(id);
      return res.status(200).json(user) ;
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to fetch user details', error: error.message });
    }
  }

  @Patch('organization/users/:userId')
  async updateTrackStatus(
    @Req() req,
    @Res() res,
    @Param("userId") id:string ,
    @Body() Body
    // @Param('userId') userId: string,
  ): Promise<any> {
    // Check if the requesting user is an admin
    const adminId = req.headers['user-id'];
    const status  = Body?.status;
    const requestingUser = await this.userService.validateUserById(adminId);
    // console.log(requestingUser)

    if (!requestingUser?.isAdmin) {
      return res.status(403).json({
        message: 'Unauthorized: Only admin can update track time status',
      });
    }

    try {
      const userToUpdate = await this.userService.validateUserById(id);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update trackTimeStatus for the user
      const updatedUserData = await this.onboardingService.updateUserConfig(id,status);
      
      return res
        .status(200)
        .json({ message: 'Track time status updated successfully' ,updatedUserData});
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Failed to update track time status' });
    }
  }
}