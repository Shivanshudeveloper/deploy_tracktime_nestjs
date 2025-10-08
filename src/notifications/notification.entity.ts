import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column()
  type: string; // BUILD_STATUS_UPDATE, DOWNLOAD_READY, etc.

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  data: any; // Additional data like buildId, downloadUrl, etc.

  @Column({ nullable: true })
  actionUrl: string; // URL for action button

  @Column({ nullable: true })
  actionText: string; // Text for action button

  @Column({ default: 'info' })
  priority: string; // info, warning, error, success

  @Column({ default: true })
  isActive: boolean; // For soft delete

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}

