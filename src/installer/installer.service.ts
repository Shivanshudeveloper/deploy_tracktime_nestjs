import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class InstallerService {
  constructor(private configService: ConfigService) {}

  async triggerInstallerBuild(organization: any, encryptedConfig: string): Promise<any> {
    const githubToken = this.configService.get('GITHUB_TOKEN');
    const githubRepo = this.configService.get('GITHUB_REPO');
    const buildToken = this.configService.get('BUILD_SECRET_TOKEN');
    
    const orgId = typeof organization === 'string'
      ? organization
      : organization._id?.toString() || organization.id?.toString() || organization.toString();

    try {
      // Step 1: Trigger the GitHub Actions workflow
      console.log(`Triggering GitHub Actions workflow for organization: ${orgId}`);
      
      const triggerResponse = await axios.post(
        `https://api.github.com/repos/${githubRepo}/actions/workflows/build-installer.yml/dispatches`,
        {
          ref: 'main',
          inputs: {
            'organization-id': orgId,
            'encrypted-config': encryptedConfig,
            'build-token': buildToken,
          },
        },
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
        },
      );

      if (triggerResponse.status === 204) {
        console.log('Workflow triggered successfully, waiting for completion...');
        
        // Step 2: Wait for the workflow to complete and get the artifact
        const artifactInfo = await this.waitForWorkflowCompletion(githubRepo, githubToken, orgId);
        
        // Step 3: Download the actual installer file
        const installerBuffer = await this.downloadArtifact(githubRepo, githubToken, artifactInfo.artifactId);
        
        return {
          success: true,
          installer: installerBuffer,
          fileName: `TrackTime_Installer_${orgId}.exe`,
          message: 'Installer built successfully',
        };
      } else {
        throw new Error(`GitHub API returned status: ${triggerResponse.status}`);
      }
    } catch (error) {
      console.error('Error triggering installer build:', error.response?.data || error.message);
      throw new HttpException(
        'Failed to build installer: ' + (error.response?.data?.message || error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async waitForWorkflowCompletion(repo: string, token: string, orgId: string): Promise<any> {
    const maxAttempts = 30; // 30 attempts
    const delayMs = 10000; // 10 seconds between attempts
    const artifactName = `TrackTime-Installer-${orgId}`;

    console.log(`Waiting for workflow completion and artifact: ${artifactName}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Get recent workflow runs
        const runsResponse = await axios.get(
          `https://api.github.com/repos/${repo}/actions/runs`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );

        // Find the most recent run (assuming it's ours)
        const recentRun = runsResponse.data.workflow_runs[0];
        
        if (recentRun) {
          console.log(`Workflow run status: ${recentRun.status}, conclusion: ${recentRun.conclusion}`);
          
          // Check if workflow is completed
          if (recentRun.status === 'completed') {
            if (recentRun.conclusion === 'success') {
              // Get artifacts for this run
              const artifactsResponse = await axios.get(
                `https://api.github.com/repos/${repo}/actions/runs/${recentRun.id}/artifacts`,
                {
                  headers: {
                    Authorization: `token ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  },
                },
              );

              // Find our specific artifact
              const artifact = artifactsResponse.data.artifacts.find(
                (art: any) => art.name === artifactName,
              );

              if (artifact) {
                console.log(`Artifact found: ${artifact.name}, ID: ${artifact.id}`);
                return {
                  artifactId: artifact.id,
                  downloadUrl: artifact.archive_download_url,
                };
              }
            } else {
              throw new Error(`Workflow failed with conclusion: ${recentRun.conclusion}`);
            }
          }
        }

        // If not completed or artifact not ready, wait and retry
        if (attempt < maxAttempts - 1) {
          console.log(`Attempt ${attempt + 1}/${maxAttempts}: Build in progress, waiting...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Error checking workflow status (attempt ${attempt + 1}):`, error.message);
        if (attempt === maxAttempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Build timeout - workflow did not complete in expected time');
  }

  private async downloadArtifact(repo: string, token: string, artifactId: number): Promise<Buffer> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repo}/actions/artifacts/${artifactId}/zip`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          responseType: 'arraybuffer',
        },
      );
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading artifact:', error.message);
      throw new Error(`Failed to download artifact: ${error.message}`);
    }
  }
}