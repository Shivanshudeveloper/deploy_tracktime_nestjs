// src/app.module.ts
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { UserController } from './users/user.controller';
import { AuthService } from './users/auth.service';
import typeOrmConfig from './typeorm.config';
import { JwtModule } from '@nestjs/jwt';
import { ProfileController } from './userProfile/userProfile.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthMiddleware } from './users/auth.middleware';
import { PaidUser } from './users/paid_users.entity';
import { Organization } from './organisation/organisation.entity';
import { DesktopApplication } from './organisation/desktop.entity';
import { Team } from './organisation/team.entity';
import { OnboardingService } from './organisation/onboarding.service';
import { OnboardingController } from './organisation/onboarding.controller';
import { UserActivity } from './users/user_activity.entity';
import { Teams } from './organisation/teams.entity';
import { TeamMember } from './organisation/teammembers.entity';
import { TeamAndTeamMemberController } from './organisation/teams.controller';
import { teamAndTeamMemberService } from './organisation/teams.service';
import { RegisteredUser } from './organisation/registeredusers.entity';
import { Subscription } from './organisation/subscription.entity';
import { EmailReportSettings } from './organisation/emailreportsetting.entity';
import { Category } from './organisation/category.entity';
import { UniqueApps } from './organisation/uniqueapps.entity';
import { DesktopAppEntity } from './organisation/desktopapp.entity';
import { applcationEntity } from './organisation/application.entity';
import { productivitySettingEntity } from './organisation/prodsetting.entity';
import { trackingPolicyEntity } from './organisation/trackingpolicy.entity';
import { Devices } from './organisation/devices.entity';
import { ConfigService } from '@nestjs/config';
import { organizationAdminService } from './organisation/OrganizationAdmin.service';
import { OrganizationAdminController } from './organisation/OrgnaizationRegister.controller';
import { CreateOrganizationAdmin } from './organisation/OrganizationAdmin.entity';
import { OnbaordingAuthMiddleware } from './middleware/OnboardingAuth.middleware'; 


@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([
      User,
      PaidUser,
      Organization,
      DesktopApplication,
      Team, 
      UserActivity,
      Teams,
      TeamMember,
      RegisteredUser,
      Subscription,
      EmailReportSettings,
      Category,
      UniqueApps,
      DesktopAppEntity,
      applcationEntity,
      productivitySettingEntity,
      trackingPolicyEntity,
      Devices,
      CreateOrganizationAdmin,
    ]),

    JwtModule.register({
      secret: 'crazy-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    UserController,
    ProfileController,
    OnboardingController,
    TeamAndTeamMemberController,
    OrganizationAdminController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OnboardingService,
    teamAndTeamMemberService,
    ConfigService,
    organizationAdminService,
  ],
})


export class AppModule implements NestModule { 
  configure(consumer: MiddlewareConsumer) { 
    consumer
      .apply(OnbaordingAuthMiddleware)
      .exclude(
        { path: '', method: RequestMethod.ALL },
        { path: '/*', method: RequestMethod.ALL },
        { path: 'auth/*', method: RequestMethod.ALL },
        { path: 'auth/*', method: RequestMethod.ALL },
      )
      .forRoutes(
        OnboardingController,
        // {path : "onboarding", method: RequestMethod.ALL}
        // { path: 'auth', method: RequestMethod.ALL },
        // { path: 'auth/*', method: RequestMethod.ALL },
        // Add other routes that require authentication here
      );
  }
}
// export class AppModule {} 