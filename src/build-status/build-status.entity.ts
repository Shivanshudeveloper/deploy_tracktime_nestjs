import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('build_status')
export class BuildStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  buildId: string; // Unique identifier for each build request

  @Column()
  userId: string;

  @Column()
  organizationId: string;

  @Column()
  os: string; // windows, linux, macos

  @Column()
  userType: string; // existing, new, anonymous

  @Column()
  status: string; // pending, building, completed, failed

  @Column({ nullable: true })
  githubWorkflowId: string;

  @Column({ nullable: true })
  githubRunId: string;

  @Column({ nullable: true })
  downloadUrl: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  progressSteps: any; // Store build progress steps

  @Column({ default: 0 })
  progressPercentage: number;

  @Column({ nullable: true })
  currentStep: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

