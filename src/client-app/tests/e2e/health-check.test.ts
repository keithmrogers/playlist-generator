import { exec } from 'child_process';
import path from 'path';

jest.setTimeout(30000);

describe('Health Check E2E', () => {
  it('should print health status and exit 0', done => {
    const indexFile = path.resolve(__dirname, '../../src/index.ts');
    exec(`npx ts-node ${indexFile} status`, (error, stdout, stderr) => {
      expect(error).toBeNull();
      expect(stdout).toMatch(/Spotify:/);
      expect(stdout).toMatch(/Discord:/);
      expect(stdout).toMatch(/Playlists directory:/);
      done();
    });
  });
});