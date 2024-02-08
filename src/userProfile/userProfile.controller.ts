import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard'; // Import your JWTAuthGuard

@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard) // Use the JWTAuthGuard to protect this route
  getProfile(@Req() req) {
    // Access the authenticated user's information from the request object
    const user = req.user;
    return { user };
  }
}
