import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('devices')
export class Devices {
  @PrimaryGeneratedColumn('uuid')
  device_uid: string;

  @Column()
  device_name:string;

  @Column({ type: 'uuid' }) 
  organization_uid: string;

  @Column()
  user_name: string;

  @Column({ type: 'uuid' })
  user_uid: string;

  @Column({type: 'varchar',length:17,nullable:true})  
  mac_address:string;
}
