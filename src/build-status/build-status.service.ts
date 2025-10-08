import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildStatus } from './build-status.entity';

@Injectable()
export class BuildStatusService {
  private readonly logger = new Logger(BuildStatusService.name);

  constructor(
    @InjectRepository(BuildStatus)
    private buildStatusRepository: Repository<BuildStatus>,
  ) {}

  async createBuildRequest(userId: string, organizationId: string, os: string, userType: string) {
    const buildStatus = this.buildStatusRepository.create({
      buildId: this.generateBuildId(),
      userId,
      organizationId,
      os,
      userType,
      status: 'pending',
      progressPercentage: 0,
      currentStep: 'Build Initiated',
      progressSteps: {
        steps: [
          { id: 1, name: 'Build Initiated', status: 'completed', timestamp: new Date() },
          { id: 2, name: 'Compilation Started', status: 'pending' },
          { id: 3, name: 'Compilation Completed', status: 'pending' },
          { id: 4, name: 'Creating Installer', status: 'pending' },
          { id: 5, name: 'Installer Ready', status: 'pending' }
        ]
      }
    });

    return await this.buildStatusRepository.save(buildStatus);
  }

  async updateBuildStatus(buildId: string, status: string, githubData?: any, progressPercentage?: number, currentStep?: string) {
    const build = await this.buildStatusRepository.findOne({ where: { buildId } });
    if (build) {
      build.status = status;
      if (githubData) {
        build.githubWorkflowId = githubData.id;
        build.githubRunId = githubData.run_id;
      }
      if (progressPercentage !== undefined) {
        build.progressPercentage = progressPercentage;
      }
      if (currentStep) {
        build.currentStep = currentStep;
      }
      
      // Update progress steps based on status
      if (build.progressSteps && build.progressSteps.steps) {
        const steps = build.progressSteps.steps;
        
        switch (status) {
          case 'building':
            if (progressPercentage >= 20 && steps[1].status === 'pending') {
              steps[1].status = 'completed';
              steps[1].timestamp = new Date();
            }
            if (progressPercentage >= 60 && steps[2].status === 'pending') {
              steps[2].status = 'completed';
              steps[2].timestamp = new Date();
            }
            if (progressPercentage >= 80 && steps[3].status === 'pending') {
              steps[3].status = 'completed';
              steps[3].timestamp = new Date();
            }
            break;
          case 'completed':
            steps[4].status = 'completed';
            steps[4].timestamp = new Date();
            build.progressPercentage = 100;
            break;
          case 'failed':
            // Mark current step as failed
            const currentStepIndex = steps.findIndex(step => step.status === 'pending');
            if (currentStepIndex >= 0) {
              steps[currentStepIndex].status = 'failed';
              steps[currentStepIndex].timestamp = new Date();
            }
            break;
        }
        
        build.progressSteps = { steps };
      }
      
      await this.buildStatusRepository.save(build);
      this.logger.log(`Build ${buildId} status updated to: ${status} (${progressPercentage}%)`);
      
      return build;
    }
    return null;
  }

  async updateBuildProgress(buildId: string, step: string, status: string, downloadUrl?: string) {
    const build = await this.buildStatusRepository.findOne({ where: { buildId } });
    if (build) {
      build.currentStep = step;
      
      // Update progress percentage based on step
      switch (step) {
        case 'compilation_started':
          build.progressPercentage = 20;
          break;
        case 'compilation_completed':
          build.progressPercentage = 60;
          break;
        case 'creating_installer':
          build.progressPercentage = 80;
          break;
        case 'installer_ready':
          build.progressPercentage = 100;
          build.status = 'completed';
          if (downloadUrl) {
            build.downloadUrl = downloadUrl;
          }
          break;
      }
      
      await this.buildStatusRepository.save(build);
      this.logger.log(`Build ${buildId} progress updated: ${step} (${build.progressPercentage}%)`);
      
      return build;
    }
    return null;
  }

  async getBuildStatus(buildId: string): Promise<BuildStatus | null> {
    return await this.buildStatusRepository.findOne({ where: { buildId } });
  }

  async findBuildByWorkflowId(workflowId: string): Promise<BuildStatus | null> {
    return await this.buildStatusRepository.findOne({ where: { githubWorkflowId: workflowId } });
  }

  async findBuildByRunId(runId: string): Promise<BuildStatus | null> {
    return await this.buildStatusRepository.findOne({ where: { githubRunId: runId } });
  }

  async setBuildError(buildId: string, errorMessage: string) {
    const build = await this.buildStatusRepository.findOne({ where: { buildId } });
    if (build) {
      build.status = 'failed';
      build.errorMessage = errorMessage;
      await this.buildStatusRepository.save(build);
      this.logger.error(`Build ${buildId} failed: ${errorMessage}`);
    }
  }

  private generateBuildId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

