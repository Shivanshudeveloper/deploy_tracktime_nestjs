// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule,RequestMethod } from '@nestjs/common';
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
import { ConfigModule } from '@nestjs/config';
// {
//   type: 'mysql',
//   host: 'localhost',
//   port: 3306,
//   username: 'root',
//   password: '',
//   database: 'tracktime_db',
//   entities: ['dist/**/*.entity{.ts,.js}'],
//   synchronize: true,
// }
@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([User,PaidUser,Organization,DesktopApplication,Team,UserActivity]), 
    JwtModule.register({
      secret: 'crazy-secret',
      signOptions: { expiresIn: '24h' },
    }),
    ConfigModule.forRoot()
  ],
  controllers:[UserController,ProfileController,OnboardingController],
  providers:[AuthService,JwtStrategy,OnboardingService]
})


export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '', method: RequestMethod.ALL },
        { path: '/*', method: RequestMethod.ALL }
      )
      .forRoutes(
        { path: 'auth', method: RequestMethod.ALL },
        { path: 'auth/*', method: RequestMethod.ALL },
        // Add other routes that require authentication here
      );
  }
}
// export class AppModule {}
