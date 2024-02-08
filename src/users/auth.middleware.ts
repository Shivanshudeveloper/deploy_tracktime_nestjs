import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service'; // Import your AuthService or user service

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {} // Inject your AuthService

  async use(req: Request, res: Response, next: NextFunction) {
    const excludedRoutes = ['/auth/login', '/auth/register',"/auth/download","/auth/version"];
   
    if (excludedRoutes.includes(req.originalUrl)) {
      // Exclude routes that   don't require authentication
      console.log('Excluded routes')
      return next();
    }

    const userId = req?.headers['user-id']; // Destructure the first element (if it's an array)
    // const userId = "335175ea-acfd-4fc3-aa22-22b45e1dddcc"
    const token = req.headers?.authorization;
    console.log(userId,token)
    if (!token || !userId) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: Missing token or user ID' });
    }

    // Check if userId is a string, handle appropriately if it's an array or not a string
    if (typeof userId !== 'string') {
      return res.status(401).json({ message: 'Unauthorized: Invalid user ID' });
    }

    // Your token validation logic here
    // For example, you might decode the token and check its validity

    // Check if the user exists in the database based on the user ID
    const userExists = await this.authService.validateUserById(userId);

    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If both token and user exist and are valid, proceed to the next middleware or route handler
    next();
  }
}
