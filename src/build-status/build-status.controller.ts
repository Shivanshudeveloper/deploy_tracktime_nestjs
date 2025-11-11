import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import { BuildStatusService, PublishReleaseInput } from './build-status.service';

@Controller('build-status')
export class BuildStatusController {
  private readonly logger = new Logger(BuildStatusController.name);

  constructor(private readonly buildStatusService: BuildStatusService) {}

  /**
   * Publish (or overwrite) the latest build for a platform.
   * Intended for internal/admin use – authentication to be added when needed.
   */
  @Post(':os')
  async publishRelease(
    @Param('os') os: string,
    @Body() body: Omit<PublishReleaseInput, 'os'>,
  ) {
    this.logger.log(`Publishing ${os} release ${body.version}`);
    return this.buildStatusService.publishRelease({
      os,
      version: body.version,
      downloadUrl: body.downloadUrl,
      releaseNotes: body.releaseNotes,
      isMandatory: body.isMandatory,
      metadata: body.metadata,
    });
  }

  /**
   * Latest build for a platform (used by auto-update service).
   */
  @Get(':os/latest')
  async getLatestRelease(@Param('os') os: string) {
    return this.buildStatusService.getLatestVersion(os);
  }

  /**
   * List historical releases – handy for admin dashboards/debugging.
   */
  @Get()
  async listReleases(@Query('os') os?: string) {
    return this.buildStatusService.listReleases(os);
  }
}