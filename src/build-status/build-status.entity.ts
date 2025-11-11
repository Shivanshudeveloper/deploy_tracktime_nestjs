import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores published desktop application builds/releases.
 * Kept intentionally lean – additional metadata can live inside the JSON column.
 */
@Entity('build_status')
@Index(['os', 'version'], { unique: true })
export class BuildStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'os', length: 32 })
  os: string; // e.g. windows, macos, linux

  @Column({ name: 'version', length: 64 })
  version: string; // semantic version (1.0.0, 1.0.1, etc.)

  @Column({ name: 'download_url', type: 'text', nullable: true })
  downloadUrl?: string; // optional direct download URL

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes?: string;

  @Column({ name: 'is_latest', default: true })
  isLatest: boolean;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any>; // legacy build-info / future fields

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}