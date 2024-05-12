import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './users/auth.service'; // Your AuthService to validate users
import { JwtPayload } from './jwt-payload.interface'; // Interface for JWT payload
import { organizationAdminService } from './organisation/OrganizationAdmin.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService,
      private readonly organizationAdminService: organizationAdminService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'crazy-secret', // Replace with your secret key
    });
  }

  async validate(payload: JwtPayload) {
    const { email,id } = payload; // Extract email and password from payload or however it's stored
    const user = await this.authService.validateUserById(payload.sub);
    console.log(user)
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
