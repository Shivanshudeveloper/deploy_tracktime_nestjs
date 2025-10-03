import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrganizationAdminDto } from './dto/organizationAdmin.dto';
import { Not, Repository } from 'typeorm';
import { CreateOrganizationAdmin } from './OrganizationAdmin.entity';
import { validate } from 'class-validator';
import { LoginAdminOrganization } from './dto/OrganizationAdminLogin.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Resend } from 'resend';
import { OnboardingService } from './onboarding.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class organizationAdminService {
  private otpStore: Map<
    string,
    { otp: string; expiry: Date; lastResend: Date }
  > = new Map();
  private resetTokenStore: Map<string, { email: string; expiry: Date }> =
    new Map();
  constructor(
    @InjectRepository(CreateOrganizationAdmin)
    private organizationAdminRepository: Repository<CreateOrganizationAdmin>,
    @Inject(forwardRef(() => OnboardingService))
    private onboardingService: OnboardingService,
    private jwtService: JwtService,
  ) {}

  async updateAdminAvatar(
    adminId: string,
    avatarUrl: string,
  ): Promise<boolean> {
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
   * Update admin profile logo (Wasabi URL)
   */
  async updateAdminProfileLogo(
    adminId: string,
    logoUrl: string,
  ): Promise<boolean> {
    try {
      const admin = await this.validateOrganizationAdminWithId(adminId);
      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // Update avatar field with Wasabi URL
      admin.avatar = logoUrl;
      await this.organizationAdminRepository.save(admin);

      console.log(`✅ Admin profile logo updated: ${adminId} -> ${logoUrl}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating admin profile logo:', error);
      throw new BadRequestException(`Error updating profile logo: ${error.message}`);
    }
  }

  /**
   * Update organization logo
   */
  async updateOrganizationLogo(
    organizationId: string,
    logoUrl: string,
  ): Promise<boolean> {
    try {
      const organization =
        await this.onboardingService.getOrganizationDetails(organizationId);
      if (!organization) {
        throw new BadRequestException('Organization not found');
      }

      await this.onboardingService.updateOrganization(organization, {
        logo: logoUrl,
      });

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
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
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
        const { firstName, lastName, email, role, avatar, password } =
          updateData.personal;

        if (firstName) admin.firstName = firstName;
        if (lastName) admin.lastName = lastName;
        if (email) {
          // Check if email is already taken by another admin
          const existingAdmin = await this.organizationAdminRepository.findOne({
            where: { email, id: Not(adminId) },
          });
          if (existingAdmin) {
            throw new BadRequestException(
              'Email is already taken by another admin',
            );
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
          admin.name =
            `${firstName || admin.firstName || ''} ${lastName || admin.lastName || ''}`.trim();
        }

        await this.organizationAdminRepository.save(admin);
      }

      // Update company information
      if (updateData.company && admin.OrganizationId) {
        const organization =
          await this.onboardingService.getOrganizationDetails(
            admin.OrganizationId,
          );
        if (organization) {
          await this.onboardingService.updateOrganization(
            organization,
            updateData.company,
          );

          // Update teams if provided
          if (updateData.company.teams) {
            await this.updateOrganizationTeams(
              admin.OrganizationId,
              updateData.company.teams,
            );
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
      throw new BadRequestException(
        `Error updating admin profile: ${error.message}`,
      );
    }
  }

  private async updateOrganizationTeams(
    organizationId: string,
    teams: any[],
  ): Promise<void> {
    try {
      // Get existing teams
      const existingTeams =
        await this.onboardingService.getAllTeam(organizationId);

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
        organization = await this.onboardingService.getOrganizationDetails(
          admin.OrganizationId,
        );
        teams = await this.onboardingService.getAllTeam(admin.OrganizationId);
        desktopApp = await this.onboardingService.findDesktopApplication(
          admin.OrganizationId,
        );
      }

      // Format teams data
      const formattedTeams = teams.map((team) => ({
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
      const companyInfo = organization
        ? {
            name: organization.name || '',
            type: organization.type || '',
            teamSize: organization.teamSize || '',
            country: organization.country || '',
            logo: organization.logo || '',
            teams: formattedTeams,
            timeZone: organization.timeZone || '',
            applicationName: desktopApp?.name || 'TrackTime',
          }
        : {
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
          'Screenshots',
        ],
        status: 'Active',
        paymentMethod: {
          type: 'visa',
          lastFour: '1234',
          expiry: '03/2026',
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
      throw new BadRequestException(
        `Error fetching admin profile: ${error.message}`,
      );
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
        where: { id: adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      return admin;
    } catch (error) {
      console.error('Error fetching admin basic info:', error);
      throw new BadRequestException(
        `Error fetching admin info: ${error.message}`,
      );
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
      // Hash the password before creating the user
      const hashedPassword = await this.hashPassword(OrganizationAdmin.password);
      
      let user = await this.organizationAdminRepository.create({
        ...OrganizationAdmin,
        password: hashedPassword, // Use the hashed password
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

      if (!admin) {
        return null;
      }

      // Use the consistent verifyPassword method
      const isPasswordValid = await this.verifyPassword(
        organizationDTO.password,
        admin.password,
      );

      if (!isPasswordValid) {
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
  async initiatePasswordReset(email: string): Promise<any> {
    try {
      // Check if admin exists with this email
      const admin = await this.organizationAdminRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!admin) {
        return {
          success: false,
          message: 'No account found with this email',
          statusCode: 404,
        };
      }

      // Check if there's a recent OTP request (prevent spam)
      const existingOTP = this.otpStore.get(email.toLowerCase());
      if (existingOTP) {
        const timeSinceLastResend =
          Date.now() - existingOTP.lastResend.getTime();
        if (timeSinceLastResend < 60000) {
          // 1 minute cooldown
          return {
            success: false,
            message: `Please wait ${Math.ceil((60000 - timeSinceLastResend) / 1000)} seconds before requesting a new OTP`,
            statusCode: 429,
          };
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      // Store OTP
      this.otpStore.set(email.toLowerCase(), {
        otp,
        expiry,
        lastResend: new Date(),
      });

      // Send OTP email
      const emailSent = await this.sendPasswordResetEmail(
        email,
        otp,
        admin.name || admin.firstName || 'User',
      );

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to send OTP email. Please try again.',
          statusCode: 500,
        };
      }

      return {
        success: true,
        email: email.toLowerCase(),
        otpExpiry: expiry,
      };
    } catch (error) {
      console.error('Error in initiatePasswordReset:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request',
        statusCode: 500,
      };
    }
  }

  async verifyPasswordResetOTP(email: string, otp: string): Promise<any> {
    try {
      const storedOTPData = this.otpStore.get(email.toLowerCase());

      if (!storedOTPData) {
        return {
          success: false,
          message: 'No OTP request found for this email',
          statusCode: 404,
        };
      }

      // Check if OTP is expired
      if (new Date() > storedOTPData.expiry) {
        this.otpStore.delete(email.toLowerCase());
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
          statusCode: 400,
        };
      }

      // Verify OTP
      if (storedOTPData.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP',
          statusCode: 400,
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset token
      this.resetTokenStore.set(resetToken, {
        email: email.toLowerCase(),
        expiry: tokenExpiry,
      });

      // Clear OTP
      this.otpStore.delete(email.toLowerCase());

      return {
        success: true,
        resetToken,
      };
    } catch (error) {
      console.error('Error in verifyPasswordResetOTP:', error);
      return {
        success: false,
        message: 'An error occurred while verifying OTP',
        statusCode: 500,
      };
    }
  }

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ): Promise<any> {
    try {
      const tokenData = this.resetTokenStore.get(resetToken);

      if (!tokenData || tokenData.email !== email.toLowerCase()) {
        return {
          success: false,
          message: 'Invalid or expired reset token',
          statusCode: 400,
        };
      }

      // Check if token is expired
      if (new Date() > tokenData.expiry) {
        this.resetTokenStore.delete(resetToken);
        return {
          success: false,
          message: 'Reset token has expired',
          statusCode: 400,
        };
      }

      // Hash the new password using the existing hashPassword method
      const hashedPassword = await this.hashPassword(newPassword);

      // Update admin password
      const updateResult = await this.organizationAdminRepository.update(
        { email: email.toLowerCase() },
        { password: hashedPassword },
      );

      if (!updateResult.affected || updateResult.affected === 0) {
        return {
          success: false,
          message: 'Failed to update password',
          statusCode: 500,
        };
      }

      // Clear reset token
      this.resetTokenStore.delete(resetToken);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return {
        success: false,
        message: 'An error occurred while resetting password',
        statusCode: 500,
      };
    }
  }

  async resendPasswordResetOTP(email: string): Promise<any> {
    try {
      const existingOTP = this.otpStore.get(email.toLowerCase());

      if (!existingOTP) {
        // If no existing OTP, initiate new request
        return this.initiatePasswordReset(email);
      }

      // Check cooldown period
      const timeSinceLastResend = Date.now() - existingOTP.lastResend.getTime();
      if (timeSinceLastResend < 60000) {
        // 1 minute cooldown
        return {
          success: false,
          message: `Please wait ${Math.ceil((60000 - timeSinceLastResend) / 1000)} seconds before requesting a new OTP`,
          statusCode: 429,
        };
      }

      // Generate new OTP
      return this.initiatePasswordReset(email);
    } catch (error) {
      console.error('Error in resendPasswordResetOTP:', error);
      return {
        success: false,
        message: 'An error occurred while resending OTP',
        statusCode: 500,
      };
    }
  }

  private async sendPasswordResetEmail(
    email: string,
    otp: string,
    userName: string,
  ): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Missing RESEND_API_KEY');
        return false;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">🔒</span>
            </div>
            <h2 style="color: #333; margin: 0;">Password Reset Request</h2>
          </div>
          
          <p style="color: #555; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #555; line-height: 1.6;">You requested to reset your password. Use the OTP below to proceed:</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <h1 style="color: white; letter-spacing: 10px; margin: 0; font-size: 36px; font-weight: bold;">${otp}</h1>
          </div>
          
          <div style="background: #fef2e0; border-left: 4px solid #f59e0b; padding: 12px 20px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>⏰ This OTP will expire in 5 minutes</strong>
            </p>
          </div>
          
          <p style="color: #777; font-size: 14px; line-height: 1.5;">
            If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 TrackTime. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

      const emailText = `
Password Reset Request

Hi ${userName},

You requested to reset your password. Use the OTP below to proceed:

${otp}

⏰ This OTP will expire in 5 minutes.

If you didn't request this password reset, please ignore this email and your password will remain unchanged.

© 2024 TrackTime. All rights reserved.
    `;

      const data = await resend.emails.send({
        from: 'TrackTime <tracktime@syncsfer.com>',
        to: email,
        subject: 'Password Reset OTP - TrackTime',
        html: emailHtml,
        text: emailText,
      });

      console.log('Password reset email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}
