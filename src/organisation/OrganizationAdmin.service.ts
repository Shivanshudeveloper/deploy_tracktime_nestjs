import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrganizationAdminDto } from './dto/organizationAdmin.dto';
import { Not, Repository } from 'typeorm';
import { CreateOrganizationAdmin } from './OrganizationAdmin.entity';
import { validate } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { LoginAdminOrganization } from './dto/OrganizationAdminLogin.dto';
import { OnboardingService } from './onboarding.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class organizationAdminService {
  constructor(
    @InjectRepository(CreateOrganizationAdmin)
    private organizationAdminRepository: Repository<CreateOrganizationAdmin>,
    @Inject(forwardRef(() => OnboardingService))
    private onboardingService: OnboardingService,
    private jwtService: JwtService,
  ) {}


async updateAdminAvatar(adminId: string, avatarUrl: string): Promise<boolean> {
  try {
    const admin = await this.validateOrganizationAdminWithId(adminId);
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    admin.avatar = avatarUrl;
    await this.organizationAdminRepository.save(admin);
    
    return true;
  } catch (error) {
    console.error('Error updating admin avatar:', error);
    throw new BadRequestException(`Error updating avatar: ${error.message}`);
  }
}

/**
 * Update organization logo
 */
async updateOrganizationLogo(organizationId: string, logoUrl: string): Promise<boolean> {
  try { 
    const organization = await this.onboardingService.getOrganizationDetails(organizationId);
    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    await this.onboardingService.updateOrganization(organization, { logo: logoUrl });
    
    return true;
  } catch (error) {
    console.error('Error updating organization logo:', error);
    throw new BadRequestException(`Error updating logo: ${error.message}`);
  }
}

/**
 * Hash password securely
 */
private async hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password
 */
async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Enhanced update admin profile data with security improvements
 */
async updateAdminProfileData(adminId: string, updateData: any): Promise<any> {
  try {
    const admin = await this.validateOrganizationAdminWithId(adminId);
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    // Update personal information
    if (updateData.personal) {
      const { firstName, lastName, email, role, avatar, password } = updateData.personal;
      
      if (firstName) admin.firstName = firstName;
      if (lastName) admin.lastName = lastName;
      if (email) {
        // Check if email is already taken by another admin
        const existingAdmin = await this.organizationAdminRepository.findOne({
          where: { email, id: Not(adminId) }
        });
        if (existingAdmin) {
          throw new BadRequestException('Email is already taken by another admin');
        }
        admin.email = email;
      }
      if (role) admin.role = role;
      if (avatar) admin.avatar = avatar;
      if (password) {
        // Hash the password before saving
        admin.password = await this.hashPassword(password);
      }
      
      // Update the name field for backward compatibility
      if (firstName || lastName) {
        admin.name = `${firstName || admin.firstName || ''} ${lastName || admin.lastName || ''}`.trim();
      }

      await this.organizationAdminRepository.save(admin);
    }

    // Update company information
    if (updateData.company && admin.OrganizationId) {
      const organization = await this.onboardingService.getOrganizationDetails(admin.OrganizationId);
      if (organization) {
        await this.onboardingService.updateOrganization(organization, updateData.company);
        
        // Update teams if provided
        if (updateData.company.teams) {
          await this.updateOrganizationTeams(admin.OrganizationId, updateData.company.teams);
        }
      }
    }

    // Return updated profile data (without password)
    const updatedProfile = await this.getAdminProfileData(adminId);
    // Don't return the actual password in the response
    updatedProfile.personal.password = '••••••••••••';
    
    return updatedProfile;

  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw new BadRequestException(`Error updating admin profile: ${error.message}`);
  }
}

private async updateOrganizationTeams(organizationId: string, teams: any[]): Promise<void> {
  try {
    // Get existing teams
    const existingTeams = await this.onboardingService.getAllTeam(organizationId);
    
    // For simplicity, we'll just log this for now
    // In a real implementation, you'd want to:
    // 1. Create new teams that don't exist
    // 2. Update existing teams
    // 3. Optionally delete teams that are no longer in the list
    
    console.log('Existing teams:', existingTeams);
    console.log('New teams data:', teams);
    
    // TODO: Implement team creation/update logic
    // This would require additional methods in OnboardingService
    
  } catch (error) {
    console.error('Error updating teams:', error);
    // Don't throw here to avoid breaking the main profile update
  }
}

/**
 * Enhanced get admin profile data with password masking
 */
async getAdminProfileData(adminId: string): Promise<any> {
  try {
    // Get admin details
    const admin = await this.validateOrganizationAdminWithId(adminId);
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    // Get organization details if admin has organization
    let organization = null;
    let teams = [];
    let desktopApp = null;

    if (admin.OrganizationId) {
      organization = await this.onboardingService.getOrganizationDetails(admin.OrganizationId);
      teams = await this.onboardingService.getAllTeam(admin.OrganizationId);
      desktopApp = await this.onboardingService.findDesktopApplication(admin.OrganizationId);
    }

    // Format teams data
    const formattedTeams = teams.map(team => ({
      name: team.name,
      members: team.teamMembersCount || 0,
    }));

    // Personal information (mask password)
    const personalInfo = {
      firstName: admin.firstName || this.extractFirstName(admin.name),
      lastName: admin.lastName || this.extractLastName(admin.name),
      email: admin.email,
      role: admin.role || (admin.isAdmin ? 'Admin' : 'User'),
      avatar: admin.avatar || null,
      joinedDate: admin.createdAt.toISOString().split('T')[0],
      lastUpdated: admin.updatedAt.toISOString().split('T')[0],
      password: admin.password || '••••••••••••', // Never send actual password
    };

    // Company information
    const companyInfo = organization ? {
      name: organization.name || '',
      type: organization.type || '',
      teamSize: organization.teamSize || '',
      country: organization.country || '',
      logo: organization.logo || '',
      teams: formattedTeams,
      timeZone: organization.timeZone || '',
      applicationName: desktopApp?.name || 'TrackTime',
    } : {
      name: '',
      type: '',
      teamSize: '',
      country: '',
      logo: '',
      teams: [],
      timeZone: '',
      applicationName: 'TrackTime',
    };

    // Mock subscription info (implement actual subscription logic later)
    const subscriptionInfo = {
      plan: 'Enterprise Plan',
      planPrice: '$70',
      maxUsers: '200',
      expiryDate: '2024-12-31',
      features: [
        'Advanced Analytics',
        'Team Management', 
        'Custom Reports',
        'Activity Timeline',
        'Screenshots'
      ],
      status: 'Active',
      paymentMethod: {
        type: 'visa',
        lastFour: '1234',
        expiry: '03/2026'
      },
      billingEmail: admin.email,
    };

    return {
      personal: personalInfo,
      company: companyInfo,
      subscription: subscriptionInfo,
    };

  } catch (error) {
    console.error('Error fetching admin profile data:', error);
    throw new BadRequestException(`Error fetching admin profile: ${error.message}`);
  }
}

private extractFirstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
}

/**
 * Helper method to extract last name from full name
 */
private extractLastName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

/**
 * Get admin basic info by ID
 */
async getAdminBasicInfo(adminId: string): Promise<CreateOrganizationAdmin> {
  try {
    const admin = await this.organizationAdminRepository.findOne({
      where: { id: adminId }
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    return admin;
  } catch (error) {
    console.error('Error fetching admin basic info:', error);
    throw new BadRequestException(`Error fetching admin info: ${error.message}`);
  }
}
  async validateOrganizationAdmin(email: string): Promise<string> {
    let user = await this.organizationAdminRepository.findOne({
      where: { email },
    });
    if (user) {
      return user?.id;
    }
    return null;
  }

  async validateOrganizationAdminWithId(
    id: string,
  ): Promise<CreateOrganizationAdmin> {
    try {
      let isAdmin = await this.organizationAdminRepository.findOne({
        where: { id: id },
      });
      return isAdmin;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async createAdminOrganization(
    OrganizationAdmin: Partial<CreateOrganizationAdminDto>,
  ): Promise<any> {
    console.log(OrganizationAdmin);
    try {
      let user = await this.organizationAdminRepository.create({
        ...OrganizationAdmin,
        OrganizationId: OrganizationAdmin?.OrganizationId || null,
        isAdmin: false,
      });
      const errors = await validate(user);

      await this.organizationAdminRepository.save(user);

      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
      // Generate JWT token for the new admin
      const payload = { email: user.email, id: user.id };
      const token = this.jwtService.sign(payload);

      return { admin: user, token };
    } catch (error) {
      console.log({ Error: error?.message });
      return null;
    }
  }

  async loginAdminOrganization(
    organizationDTO: Partial<LoginAdminOrganization>,
  ): Promise<any> {
    try {
      let admin = await this.organizationAdminRepository.findOne({
        where: { email: organizationDTO?.email },
      });
      if (!admin || admin?.password !== organizationDTO?.password) {
        return null;
      }

      // Generate JWT token for the new admin
      const payload = { email: admin.email, id: admin?.id };
      const token = this.jwtService.sign(payload);

      return { admin: admin, token };
    } catch (error) {
      console.log({ Error: error?.message });
      return null;
    }
  }
  async IsValidateToken(token: string): Promise<any> {
    console.log('validateToken', token);
    // let validateToken = await this.jwtService.verify(token);
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      // throw new BadRequestException('Invalid token');
      return null;
    }

    // if(!validateToken){
    //   return null;
    // }
    // return validateToken;
  }
  async findOrganizationById(id: string): Promise<string> {
    console.log('id', id);
    if (id) {
      let organization = await this.organizationAdminRepository.findOne({
        where: { id },
      });
      console.log('organization', organization);
      return organization?.OrganizationId;
    }
    return null;
  }
  async findOrganization(id: string): Promise<CreateOrganizationAdmin> {
    console.log('id', id);
    if (id) {
      let organization = await this.organizationAdminRepository.findOne({
        where: { OrganizationId: id },
      });
      console.log('organization', organization);
      return organization;
    }
    return null;
  }
  async findUserAdminById(id: string): Promise<Boolean> {
    if (!id) {
      return false;
    }
    let userAdmin = await this.organizationAdminRepository.findOne({
      where: { id },
    });
    console.log(userAdmin);
    return userAdmin?.isAdmin;
  }
  async updateUserOrganizationId(
    organizationAdminId: string,
    newOrganizationId: string,
  ): Promise<CreateOrganizationAdmin> {
    try {
      // Retrieve the organization admin by id
      const organizationAdmin = await this.organizationAdminRepository.findOne({
        where: { id: organizationAdminId },
      });

      if (!organizationAdmin) {
        throw new BadRequestException('Organization Admin not found');
      }

      // Update the organizationId
      organizationAdmin.OrganizationId = newOrganizationId;

      // Validate entity before saving
      const errors = await validate(organizationAdmin);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }

      // Save the updated entity
      await this.organizationAdminRepository.save(organizationAdmin);

      return organizationAdmin;
    } catch (error) {
      console.error(`Error updating organization ID: ${error.message}`);
      throw new BadRequestException(
        `Error updating organization ID: ${error.message}`,
      );
    }
  }

  async findUserAdminByIdAndUpdateStatus(id: string): Promise<Boolean> {
    try {
      let adminById = await this.organizationAdminRepository.findOne({
        where: { id },
      });
      if (!adminById) {
        return false;
      }
      let status = true;
      adminById.isAdmin = status;
      let userSaveData = await this.organizationAdminRepository.save(adminById);
      return userSaveData.isAdmin;
    } catch (err) {
      throw new BadRequestException(
        `Error updating organization ID: ${err.message}`,
      );
    }
  }
}
