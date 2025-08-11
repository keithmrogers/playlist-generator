import http from 'http';
import { URL } from 'url';

export interface OAuthCallbackResult {
  code?: string;
  error?: string;
  state?: string;
}

export class OAuthCallbackService {
  /**
   * Start a temporary local server to handle OAuth callback
   * Returns a promise that resolves with the authorization code or error
   */
  static startCallbackServer(port: number = 8888, timeoutMs: number = 5 * 60 * 1000): Promise<OAuthCallbackResult> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (req.url?.startsWith('/callback')) {
          try {
            const url = new URL(req.url, `http://localhost:${port}`);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const state = url.searchParams.get('state');
            
            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window and try again.</p>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #e74c3c; }
                </style>
              `);
              server.close();
              resolve({ error: error || undefined, state: state || undefined });
              return;
            }
            
            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the CLI.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #2ecc71; }
                </style>
              `);
              server.close();
              resolve({ code: code || undefined, state: state || undefined });
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>Authorization Failed</h1>
                <p>No authorization code received.</p>
                <p>You can close this window and try again.</p>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #e74c3c; }
                </style>
              `);
              server.close();
              resolve({ error: 'no_code_received', state: state || undefined });
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <h1>Server Error</h1>
              <p>An error occurred processing the callback.</p>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
              </style>
            `);
            server.close();
            reject(err);
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>OAuth Callback Server</h1>
            <p>This server is waiting for an OAuth callback.</p>
            <p>Please complete the authorization in your browser.</p>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #3498db; }
            </style>
          `);
        }
      });

      server.listen(port, () => {
        console.log(`OAuthCallbackService: callback server listening on port ${port}`);
      });

      server.on('error', (err) => {
        console.error(`OAuthCallbackService: callback server error:`, err);
        reject(err);
      });

      // Timeout after specified time
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error(`Authorization timeout - no callback received within ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      // Clear timeout when server closes
      server.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Open a URL in the user's default browser
   * Cross-platform implementation
   */
  static async openBrowser(url: string): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const platform = process.platform;
      
      if (platform === 'win32') {
        exec(`start "" "${url}"`);
      } else if (platform === 'darwin') {
        exec(`open "${url}"`);
      } else {
        exec(`xdg-open "${url}"`);
      }
    } catch (err) {
      console.warn('OAuthCallbackService: Could not auto-open browser');
      throw new Error('Could not auto-open browser');
    }
  }

  /**
   * Complete OAuth flow with automatic browser opening and callback handling
   */
  static async completeOAuthFlow(
    authUrl: string, 
    port: number = 8888, 
    timeoutMs: number = 5 * 60 * 1000,
    autoOpenBrowser: boolean = true
  ): Promise<OAuthCallbackResult> {
    console.log('OAuthCallbackService: Starting OAuth flow...');
    
    try {
      // Start the callback server
      const callbackPromise = this.startCallbackServer(port, timeoutMs);
      
      console.log('OAuthCallbackService: Opening browser for authorization...');
      console.log('OAuthCallbackService: If the browser doesn\'t open automatically, visit:');
      console.log(authUrl);
      
      // Try to open the browser automatically
      if (autoOpenBrowser) {
        try {
          await this.openBrowser(authUrl);
        } catch (err) {
          console.log('OAuthCallbackService: Please visit the URL manually');
        }
      }
      
      console.log('OAuthCallbackService: Waiting for authorization...');
      
      // Wait for the callback
      const result = await callbackPromise;
      
      if (result.error) {
        throw new Error(`OAuth authorization failed: ${result.error}`);
      }
      
      if (!result.code) {
        throw new Error('No authorization code received');
      }
      
      console.log('OAuthCallbackService: Authorization successful!');
      return result;
      
    } catch (error) {
      console.error('OAuthCallbackService: OAuth flow failed:', error);
      throw error;
    }
  }
}
