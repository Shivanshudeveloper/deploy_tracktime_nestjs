import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrganizationAdminDto } from './dto/organizationAdmin.dto';
import { Repository } from 'typeorm';
import { CreateOrganizationAdmin } from './OrganizationAdmin.entity';
import { validate } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { LoginAdminOrganization } from './dto/OrganizationAdminLogin.dto';

@Injectable()
export class organizationAdminService {
  constructor(
    @InjectRepository(CreateOrganizationAdmin)
    private organizationAdminRepository: Repository<CreateOrganizationAdmin>,
    private jwtService: JwtService,
  ) {}
  async validateOrganizationAdmin(email: string): Promise<string> {
    let user = await this.organizationAdminRepository.findOne({
      where: { email },
    });
    if (user) {
      return user?.id;
    }
    return null;
  }

  async validateOrganizationAdminWithId(id:string):Promise<CreateOrganizationAdmin>{
    try {
      let isAdmin = await this.organizationAdminRepository.findOne({where:{id:id}});
      return isAdmin;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async createAdminOrganization(OrganizationAdmin: Partial<CreateOrganizationAdmin>): Promise<any> {
    try {
      let user = await this.organizationAdminRepository.create({
        ...OrganizationAdmin,
        isAdmin:false,
      });
      const errors = await validate(user);
      
      await this.organizationAdminRepository.save(user);

      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
      // Generate JWT token for the new admin
      const payload = { email: user.email, id: user.id};
      const token = this.jwtService.sign(payload);

      return {"admin":user,token};
    } catch (error) {
      console.log({ Error: error?.message });
      return null;
    }
  }

  async loginAdminOrganization(organizationDTO: Partial<LoginAdminOrganization>,): Promise<any> {
    try {
      let admin = await this.organizationAdminRepository.findOne({where:{email:organizationDTO?.email}});
      if(!admin ||admin?.password !== organizationDTO?.password){
        return null;
      }

      // Generate JWT token for the new admin
      const payload = { email: admin.email, id: admin?.id};
      const token = this.jwtService.sign(payload);

      return {"admin":admin,token};
    } catch (error) {
      console.log({ Error: error?.message });
      return null;
    }
  }
  async IsValidateToken(token:string): Promise<any> {
    console.log("validateToken",token);
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
  async findOrganizationById(id:string):Promise<string> {
    console.log("id", id);
    if(id){
      let organization = await this.organizationAdminRepository.findOne({where :{id}});
      console.log("organization",organization);
      return organization?.OrganizationId;
    }
    return null;
  }
  async findUserAdminById(id:string):Promise<Boolean>{
    if(!id){
      return false;
    }
    let userAdmin = await this.organizationAdminRepository.findOne({where :{id}})
    console.log(userAdmin)
    return userAdmin?.isAdmin;
  }
  async updateUserOrganizationId(organizationAdminId: string, newOrganizationId: string): Promise<CreateOrganizationAdmin> {
    try {
      // Retrieve the organization admin by id
      const organizationAdmin = await this.organizationAdminRepository.findOne({
        where: { id: organizationAdminId }
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
      throw new BadRequestException(`Error updating organization ID: ${error.message}`);
    }
  }

  async findUserAdminByIdAndUpdateStatus(id:string):Promise<Boolean>{
    try{
      let adminById = await this.organizationAdminRepository.findOne({where:{id}});
      if(!adminById){
        return false;
      }
      let status = true;
      adminById.isAdmin = status;
      let userSaveData = await this.organizationAdminRepository.save(adminById)
      return userSaveData.isAdmin;
    }catch(err){
      throw new BadRequestException(`Error updating organization ID: ${err.message}`);
    }
  }
}
