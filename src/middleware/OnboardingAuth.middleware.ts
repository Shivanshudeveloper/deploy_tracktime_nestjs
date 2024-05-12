import { Injectable, NestMiddleware } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { organizationAdminService } from 'src/organisation/OrganizationAdmin.service';

@Injectable()
export class OnbaordingAuthMiddleware implements NestMiddleware {
  private organizationAdminService:organizationAdminService
  constructor(private moduleRef: ModuleRef){}


 async use(req: Request, res: Response, next: NextFunction) { 
    this.organizationAdminService = this.moduleRef.get(organizationAdminService, { strict: false });
    console.log("token before spliting",req.header["authorization"]);
    const token = req.headers['authorization']?.split(' ')[1]; // Example token retrieval
    // const organizationId = req.headers["organizationId"];
  // console.log(token)
  console.log(req?.url)
  if(req?.url ==="/onboarding/users/configStatus"){
    next();
    return;
  }
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const isValid = await this.organizationAdminService.IsValidateToken(token); // Ensure correct method name
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      // console.log(isValid.id);
      // const OrganizationAdminId = isValid?.id;
      let organizationAdminId = await isValid?.id; 
      organizationAdminId = await this.isValidOrganizationAndAdmin(organizationAdminId);

      if(!organizationAdminId) {
        return res.status(401).json({ message: 'Admin Id not present' });
      }
      req.headers["organizationAdminId"] = organizationAdminId;
      // console.log(organizationAdminId)
      next(); 
    } catch (error) {
      // It's good to log the error or handle it appropriately
      console.error('Error in token validation:', error);
      return res.status(500).json({ message: 'Failed to validate token' });
    }
  }
 
  private async isValidOrganizationAndAdmin(adminId: string):Promise<string>{
    // Database validation logic here
    const isAdmin = await this.organizationAdminService.validateOrganizationAdminWithId(adminId);
    if(isAdmin?.id){
      return isAdmin.id;
    }

    return null; // return true or false based on validation
  }
}
