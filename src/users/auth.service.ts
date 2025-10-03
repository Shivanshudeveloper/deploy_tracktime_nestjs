// auth.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { validate } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { PaidUser } from './paid_users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
// private readonly ORY_API_BASE_URL = 'https://inspiring-liskov-jmmrgchi6n.projects.oryapis.com/';

// async login(data: { username: string, password: string }) {
//   try {
//     const response = await axios.post(`${this.ORY_API_BASE_URL}/login`, data);
//     const { accessToken } = response.data; // Assuming accessToken is returned
//     return { accessToken };
//   } catch (error) {
//     throw new Error('Login failed. Invalid credentials.'); // Handle error appropriately
//   }
// }
// async registerUser(data: { username: string, email: string, password: string }) {
//   try {
//     const response = await axios.post(`${this.ORY_API_BASE_URL}/register`, data);
//     return response.data;
//   } catch (error) {
//     throw new Error('User registration failed.'); // Handle error appropriately
//   }
// }
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @InjectRepository(PaidUser)
    private paidUserRepository: Repository<PaidUser>,
    
  ) {}

  async addToPaidUsers(user: User): Promise<void> {
    try {
      const paidUser = new PaidUser();
      paidUser.user_id = user.userUUID; // Parse the string as a hexadecimal number  or user.userUUID, based on your User entity
      paidUser.username = user.userName;

      await this.paidUserRepository.save(paidUser);
    } catch (error) {
      throw new Error('Failed to add user to paid_users table');
    }
  }
  async registerUser(userData: Partial<User>): Promise<User> {
    console.log("Register Userdata",userData)
    
    // Hash password if provided
    if (userData.password) {
      const saltRounds = 12;
      userData.password = await bcrypt.hash(userData.password, saltRounds);
    }
    
    const newUser = await this.userRepository.create(userData);
    const errors = await validate(newUser);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return await this.userRepository.save(newUser);
  }
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    console.log(user);
    
    if (user && user['password']) {
      // Use bcrypt to compare the plain password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, user['password']);
      if (isPasswordValid) {
        return user;
      }
    }
    return null;
  }

  async ValidateUserByGmail(email: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { email: email } });
    console.log("email: " + email);
    return user;
  }

  async login(user: User): Promise<string> {
    const payload = { email: user.email, sub: user.userUUID };
    return this.jwtService.sign(payload);
  }

  async validateUserById(userUUID: string): Promise<User | null> {
    if (!userUUID) {
      return null; // Return null if userUUID is not provided
    }

    try {
      const user = await this.userRepository.findOne({ where: { userUUID } });

      if (!user) {
        return null; // Return null if user is not found
      }

      return user; // Return the found user
    } catch (err) {
      return null; // Return null in case of any error
    }
  }
  async markUserAsPaid(paidUserData: Partial<PaidUser>): Promise<void> {
    try {
      const paidUser = this.paidUserRepository.create(paidUserData);
      await this.paidUserRepository.save(paidUser);
    } catch (error) {
      throw new Error('Failed to mark user as paid');
    }
  }
  async getUserConfig(deviceId: string): Promise<any> {
    try {
      // Logic to fetch user details from your database or storage based on user ID
      const user = await this.userRepository.findOne({
        where: { userUUID: deviceId },
      });

      if (!user) {
        return null;
      }

      // Assuming your User entity has a 'config' field
      const { config } = user;

      // Return the user's configuration and track time status or modify as needed
      console.log('user', user);
      return {
        trackTimeStatus: config?.trackTimeStatus || 'StopForever',
        // Add other user-specific config details here
      };
    } catch (error) {
      throw new Error('Failed to fetch user config');
    }
  }



  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }
  // Additional method to check if a user is an admin
  // async isAdmin(userUUID: string): Promise<boolean> {
  //   const user = await this.userRepository.findOne({ where: { userUUID } });
  //   return user?.isAdmin || false;
  // }
  // async createAdminUser(adminData: Partial<User>): Promise<User> {
  //   const adminUser = this.userRepository.create({
  //     ...adminData,
  //     isAdmin: true,
  //   });
  //   return await this.userRepository.save(adminUser);
  // }
  async isUserPaid(user_id: string): Promise<boolean> {
    const paidUser = await this.paidUserRepository.findOne({
      where: { user_id },
    });
    if (paidUser?.user_id) {
      return false;
    }
    return true;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {  organizationId },
    });
  }
}
