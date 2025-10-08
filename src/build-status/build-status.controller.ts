import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { BuildStatusService } from './build-status.service';
import { NotificationGateway } from '../notifications/notification.gateway';

@Controller('webhooks')
export class BuildStatusController {
  private readonly logger = new Logger(BuildStatusController.name);

  constructor(
    private readonly buildStatusService: BuildStatusService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Post('github/build-status')
  async handleGitHubWebhook(@Body() payload: any) {
    this.logger.log('Received GitHub webhook:', JSON.stringify(payload, null, 2));
    
    try {
      // Handle different GitHub Actions events
      switch (payload.action) {
        case 'workflow_run':
          await this.handleWorkflowRun(payload.workflow_run);
          break;
        case 'step_update':
          await this.handleStepUpdate(payload);
          break;
        case 'check_run':
          await this.handleCheckRun(payload.check_run);
          break;
        default:
          this.logger.warn(`Unhandled webhook action: ${payload.action}`);
      }
    } catch (error) {
      this.logger.error('Error handling GitHub webhook:', error);
    }
  }

  private async handleWorkflowRun(workflowRun: any) {
    this.logger.log('Handling workflow run:', workflowRun);
    
    const status = workflowRun.conclusion || workflowRun.status;
    const buildId = workflowRun.buildId;
    
    if (!buildId) {
      this.logger.warn('No buildId found in workflow run');
      return;
    }
    
    // Update build status
    const build = await this.buildStatusService.updateBuildStatus(
      buildId, 
      status, 
      workflowRun,
      status === 'completed' ? 100 : undefined,
      status === 'completed' ? 'Installer Ready' : undefined
    );

    if (build) {
      // Emit real-time update to frontend
      this.notificationGateway.emitBuildProgress(build.userId, buildId, {
        status,
        progress: build.progressPercentage,
        currentStep: build.currentStep,
        downloadUrl: workflowRun.downloadUrl || build.downloadUrl,
        errorMessage: workflowRun.error || build.errorMessage
      });

      // Send notification
      this.notificationGateway.emitNotification(build.userId, {
        type: 'BUILD_STATUS_UPDATE',
        message: `Build ${status === 'completed' ? 'completed successfully' : 'failed'}`,
        data: { buildId, status, os: build.os }
      });
    }
  }

  private async handleStepUpdate(payload: any) {
    const { step, buildId, status, downloadUrl } = payload;
    
    if (!buildId) {
      this.logger.warn('No buildId found in step update');
      return;
    }
    
    this.logger.log(`Handling step update: ${step} for build ${buildId}`);
    
    // Update build progress
    const build = await this.buildStatusService.updateBuildProgress(buildId, step, status, downloadUrl);
    
    if (build) {
      // Emit real-time update to frontend
      this.notificationGateway.emitBuildProgress(build.userId, buildId, {
        status: build.status,
        progress: build.progressPercentage,
        currentStep: build.currentStep,
        downloadUrl: build.downloadUrl,
        step: step
      });
    }
  }

  private async handleCheckRun(checkRun: any) {
    this.logger.log('Handling check run:', checkRun);
    
    // Handle individual step updates from GitHub Actions
    const buildStatus = await this.buildStatusService.findBuildByWorkflowId(checkRun.external_id);
    if (buildStatus) {
      await this.updateBuildProgress(buildStatus.buildId, checkRun);
    }
  }

  private async updateBuildProgress(buildId: string, checkRun: any) {
    // Map GitHub Actions step names to our progress steps
    const stepMapping = {
      'Install Rust': 'compilation_started',
      'Build Application': 'compilation_completed', 
      'Create Installer': 'creating_installer',
      'Upload Installer': 'installer_ready'
    };

    const stepName = checkRun.name;
    const mappedStep = stepMapping[stepName];
    
    if (mappedStep) {
      const status = checkRun.conclusion === 'success' ? 'completed' : 'failed';
      await this.buildStatusService.updateBuildProgress(buildId, mappedStep, status);
    }
  }

  @Get('build-status/:buildId')
  async getBuildStatus(@Param('buildId') buildId: string) {
    const build = await this.buildStatusService.getBuildStatus(buildId);
    if (!build) {
      return { error: 'Build not found' };
    }
    
    return {
      buildId: build.buildId,
      status: build.status,
      progress: build.progressPercentage,
      currentStep: build.currentStep,
      downloadUrl: build.downloadUrl,
      errorMessage: build.errorMessage,
      progressSteps: build.progressSteps,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt
    };
  }
}

