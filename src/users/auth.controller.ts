import { Controller, Get, Post, Body } from '@nestjs/common';
import axios from 'axios'; // For making HTTP requests

@Controller('auth')
export class AuthController {
  private readonly googleAuthEndpoint = 'https://www.googleapis.com/oauth2/v3/tokeninfo';

  constructor(private readonly oryClient) {} // Initialize your ORY client

  @Post('google-signin')
  async googleSignIn(@Body() { idToken, flowId }: { idToken: string; flowId: string }) {
    try {
      // Verify Google ID Token
      const { data } = await axios.get(`${this.googleAuthEndpoint}?id_token=${idToken}`);
      
      if (data) {
        // Create payload for ORY Hydra updateRegistrationFlow
        const body = {
          idToken,
          method: 'oidc',
          provider: 'google',
        };

        // Submit the updateRegistrationFlow endpoint with the payload
        await this.oryClient.getFrontendApi().updateRegistrationFlow({
          flow: flowId,
          updateRegistrationFlowBody: {
            oneOf: { value1: body },
          },
        });

        return { success: true, message: 'Google sign-in successful' };
      }
    } catch (error) {
      console.error('Google sign-in error:', error.message);
      return { success: false, message: 'Error signing in with Google' };
    }
  }
}

// catches & cookies in frontend
// CSS pre-processor 
// 