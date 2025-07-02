/// My question is that the person who is registered is either admin or normal user in the oranization
// when the orgnization onboarding process is completed by him he will be considered as admin or main
// of that organization as he is the one who completed the organization process.

// Organization and Organization Admin both will be separate table
// OrganizationAdmin table will consist the foriegn key of that organization so we can know of which
// organization he is the admin. And

// for that I need to create a seprate DTO and everything for that organizationAdmin person
// I will creaet an user while registering but and there will be a status mentioning that
// he is a admin or not isAdmin:true or false
// so if a user until completes the onbaording process he will not be considered as admin
// and the status will remain false and once the process is completed the status will be true
// for the admin the schema for now looks like this

// id
// email
// password
// isAdmin
// OrganizationId

// for one organization there can be multiple admins but for one Admin
// there can be only one organization. so it's a manytoone relationship

import { Body, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateOrganizationAdminDto } from './dto/organizationAdmin.dto';
import { Response } from 'express';
import { organizationAdminService } from './OrganizationAdmin.service';
import { LoginAdminOrganization } from './dto/OrganizationAdminLogin.dto';
import { tokenDto } from './dto/token.dto';

@Controller('auth')
export class OrganizationAdminController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly organizationAdminService: organizationAdminService,
  ) {}

  @Post('organization/register')
  async createOrganizationAdmin(
    @Body() createOrganizationDto: CreateOrganizationAdminDto,
    @Res() res: Response,
  ): Promise<any> {
    console.log('data', createOrganizationDto);
    let organizationAdmin =
      await this.organizationAdminService.validateOrganizationAdmin(
        createOrganizationDto?.email,
      );
    if (organizationAdmin) {
      return res
        .status(403)
        .send({ message: 'User already exists with email address!' });
    }

    let newAdmin = await this.organizationAdminService.createAdminOrganization(
      createOrganizationDto,
    );

    if (!newAdmin || !newAdmin?.admin?.id) {
      return res.status(403).send({ message: 'Admin creattion failed' });
    }

    return res
      .status(200)
      .send({
        message: 'Organization Admin created successfully!',
        token: newAdmin?.token,
      });
  }

  @Post('/organization/u/validateToken')
  async validateToken(
    @Body() Token: tokenDto,
    @Res() res: Response,
  ): Promise<any> {
    const { token } = Token;
    // console.log(token);
    try {
      if (!token) {
        return res
          .status(400)
          .json({ message: 'Token is missing!', status: false });
      }
      let isValidToken =
        await this.organizationAdminService.IsValidateToken(token);
      console.log(isValidToken);

      if (!isValidToken) {
        return res
          .status(401)
          .json({ message: 'Invalid token!', status: false });
      }

      let userAdmin = await this.organizationAdminService.findUserAdminById(
        isValidToken.id,
      );
      return res.status(200).json({ isValidToken, status: true, userAdmin });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, status: false });
    }
  }

  @Post('organization/login')
  async loginAdminOrganization(
    @Body() adminloginDto: LoginAdminOrganization,
    @Res() res: Response,
  ): Promise<any> {
    // console.log('data', createOrganizationDto);
    let organizationAdmin =
      await this.organizationAdminService.validateOrganizationAdmin(
        adminloginDto?.email,
      );

    if (!organizationAdmin) {
      return res.status(403).send({ message: 'Invalid Admin!!' });
    }

    let newAdmin =
      await this.organizationAdminService.loginAdminOrganization(adminloginDto);

    if (!newAdmin || !newAdmin?.admin?.id) {
      return res.status(404).send({ message: 'Incorrect email or password' });
    }

    return res
      .status(200)
      .send({
        message: 'OrganizationAdmin Logged in succesfully !!',
        token: newAdmin?.token,
      });
  }

  // Add this method to your OrganizationAdminController class


}
