import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BuildStatusService } from '../build-status/build-status.service';
import { VersionCheckResponseDto } from './dto/version-check-response.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UpdateService {
  private readonly logger = new Logger(UpdateService.name);

  constructor(private readonly buildStatusService: BuildStatusService) {}

  async checkForUpdates(os: string): Promise<VersionCheckResponseDto | null> {
    this.logger.log(`Checking for updates for OS: ${os}`);

    // Get the latest version for the specified OS
    const latestBuild = await this.buildStatusService.getLatestVersion(os);

    if (!latestBuild) {
      this.logger.warn(`No latest version found for OS: ${os}`);
      return null;
    }

    // Construct the download URL
    const downloadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/update/download/${os}`;

    return {
      currentVersion: latestBuild.version || '0.1.0',
      downloadUrl,
      releaseNotes: latestBuild.releaseNotes || 'No release notes available',
      isMandatory: false, // Can be enhanced later based on version difference
      publishedAt: latestBuild.updatedAt,
    };
  }

  async getLatestExecutable(os: string): Promise<{ filePath: string; fileName: string }> {
    this.logger.log(`Getting latest executable for OS: ${os}`);

    // Get the latest version for the specified OS
    const latestBuild = await this.buildStatusService.getLatestVersion(os);

    if (!latestBuild) {
      throw new NotFoundException(`No latest version found for OS: ${os}`);
    }

    // Determine the installer path based on OS
    let installerPath: string;
    let fileName: string;

    switch (os.toLowerCase()) {
      case 'windows':
        installerPath = path.join(
          __dirname,
          '..',
          '..',
          'src',
          'organisation',
          'Installer',
          'windows',
          'tracktimeInstaller.exe'
        );
        fileName = 'tracktimeInstaller.exe';
        break;
      case 'linux':
        installerPath = path.join(
          __dirname,
          '..',
          '..',
          'src',
          'organisation',
          'Installer',
          'linux',
          'productivity-desktop_0.1.0-1_amd64.deb'
        );
        fileName = 'productivity-desktop_0.1.0-1_amd64.deb';
        break;
      case 'macos':
        installerPath = path.join(
          __dirname,
          '..',
          '..',
          'src',
          'organisation',
          'Installer',
          'macos',
          'Installer',
          'TrackTime-1.0.0.dmg'
        );
        fileName = 'TrackTime-1.0.0.dmg';
        break;
      default:
        throw new NotFoundException(`Unsupported OS: ${os}`);
    }

    // Check if file exists
    if (!fs.existsSync(installerPath)) {
      this.logger.error(`Installer file not found at: ${installerPath}`);
      throw new NotFoundException(`Installer file not found for OS: ${os}`);
    }

    return { filePath: installerPath, fileName };
  }

  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }
}





