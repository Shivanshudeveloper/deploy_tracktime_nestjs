import { Controller, Get, Param, Res, Logger, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UpdateService } from './update.service';
import * as fs from 'fs';

@Controller('api/update')
export class UpdateController {
  private readonly logger = new Logger(UpdateController.name);

  constructor(private readonly updateService: UpdateService) {}

  @Get('check')
  async checkForUpdates() {
    this.logger.log('Version check request received for Windows');
    
    // Default to Windows since the Rust app is Windows-only
    const updateInfo = await this.updateService.checkForUpdates('windows');
    
    if (!updateInfo) {
      return {
        currentVersion: '0.1.0',
        downloadUrl: '',
        releaseNotes: 'No updates available',
        isMandatory: false,
        publishedAt: new Date(),
      };
    }

    return updateInfo;
  }

  @Get('check/:os')
  async checkForUpdatesByOS(@Param('os') os: string) {
    this.logger.log(`Version check request received for OS: ${os}`);
    
    const updateInfo = await this.updateService.checkForUpdates(os);
    
    if (!updateInfo) {
      return {
        currentVersion: '0.1.0',
        downloadUrl: '',
        releaseNotes: 'No updates available',
        isMandatory: false,
        publishedAt: new Date(),
      };
    }

    return updateInfo;
  }

  @Get('download/:os')
  async downloadLatestVersion(@Param('os') os: string, @Res() res: Response) {
    this.logger.log(`Download request received for OS: ${os}`);

    try {
      const { filePath, fileName } = await this.updateService.getLatestExecutable(os);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`Installer file not found for OS: ${os}`);
      }

      const stat = fs.statSync(filePath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', stat.size);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        this.logger.error(`Error streaming file: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      });

      this.logger.log(`Successfully streaming ${fileName} for OS: ${os}`);
    } catch (error) {
      this.logger.error(`Error in download: ${error.message}`);
      if (!res.headersSent) {
        res.status(404).json({ error: error.message });
      }
    }
  }
}







