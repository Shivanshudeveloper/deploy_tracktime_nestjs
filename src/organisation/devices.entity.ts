import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';


export enum TrackTimeStatus {
  Pause = 'Pause',
  Resume = 'Resume',
  StopForever = 'StopForever',
}
class userConfig{
  @IsEnum(TrackTimeStatus)
  trackTimeStatus: TrackTimeStatus
}
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

  @Column({ type: 'uuid',nullable:true })
  user_uid: string;

  @Column({type: 'varchar',length:17,nullable:true})  
  mac_address:string;

  @ValidateNested()
  @Type(() => userConfig)
  @Column('json', { nullable: true })
  config: userConfig;

  @CreateDateColumn({name:"created_at"})
  created_at: Date;

  @UpdateDateColumn({name:"updated_at"})
  updated_at: Date;
}
