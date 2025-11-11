import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildStatus } from './build-status.entity';

export interface PublishReleaseInput {
  os: string;
  version: string;
  downloadUrl?: string;
  releaseNotes?: string;
  isMandatory?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class BuildStatusService {
  private readonly logger = new Logger(BuildStatusService.name);

  constructor(
    @InjectRepository(BuildStatus)
    private readonly buildStatusRepository: Repository<BuildStatus>,
  ) {}

  async getLatestVersion(os: string): Promise<BuildStatus | null> {
    return this.buildStatusRepository.findOne({
      where: {
        os: os.toLowerCase(),
        isLatest: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async publishRelease(input: PublishReleaseInput): Promise<BuildStatus> {
    const normalisedOs = input.os.toLowerCase();

    await this.buildStatusRepository.update(
      { os: normalisedOs, isLatest: true },
      { isLatest: false },
    );

    const release = this.buildStatusRepository.create({
      os: normalisedOs,
      version: input.version,
      downloadUrl: input.downloadUrl,
      releaseNotes: input.releaseNotes,
      isMandatory: input.isMandatory ?? false,
      isLatest: true,
      metadata: input.metadata,
    });

    const saved = await this.buildStatusRepository.save(release);
    this.logger.log(
      `Published ${normalisedOs} release ${saved.version} (mandatory=${saved.isMandatory})`,
    );
    return saved;
  }

  async listReleases(os?: string): Promise<BuildStatus[]> {
    const where = os ? { os: os.toLowerCase() } : {};
    return this.buildStatusRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async markReleaseAsLatest(id: string): Promise<BuildStatus> {
    const release = await this.buildStatusRepository.findOne({ where: { id } });
    if (!release) {
      throw new NotFoundException(`Release ${id} not found`);
    }

    await this.buildStatusRepository.update(
      { os: release.os, isLatest: true },
      { isLatest: false },
    );

    release.isLatest = true;
    await this.buildStatusRepository.save(release);

    this.logger.log(`Release ${release.id} promoted to latest for ${release.os}`);
    return release;
  }

  async deleteRelease(id: string): Promise<void> {
    await this.buildStatusRepository.delete(id);
  }
}
