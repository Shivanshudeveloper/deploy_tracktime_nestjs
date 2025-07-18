import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('user_activity')
export class UserActivity {
  @PrimaryColumn()
  activity_uuid: string;

  @Column()
  user_uid: string;

  @Column() 
  organization_id: string;

  @Column()
  timestamp: Date;

  @Column()
  device_user_name: string;

  @Column()
  app_name: string;

  @Column()
  url: string;

  @Column()
  page_title: string;

  // REMOVED: screenshot column (no longer store base64 in DB)

  @Column()
  productivity_status: string;

  @Column()
  meridian: string;

  @Column()
  ip_address: string;

  @Column()
  mac_address: string;

  @Column()
  mouse_movement: boolean;

  @Column()
  mouse_clicks: number;

  @Column()
  keys_clicks: number;

  @Column()
  status: number;

  @Column()
  cpu_usage: string;

  @Column()
  ram_usage: string;

  @Column({ nullable: true })
  screenshot_uid: string; // Reference to Wasabi stored screenshot
  
  // OPTIONAL: Add thumbnail_uid if you want to track thumbnails separately
  @Column({ nullable: true })
  thumbnail_uid: string; // Reference to Wasabi stored thumbnail
}