import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubAuth } from './authorize.js';
import * as octoDevAuth from '@octokit/auth-oauth-device';
import * as openModule from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock dependencies
vi.mock('@octokit/auth-oauth-device', () => {
  return {
    createOAuthDeviceAuth: vi.fn()
  };
});

vi.mock('open', () => {
  return {
    __esModule: true,
    default: vi.fn(() => Promise.resolve())
  };
});

vi.mock('chalk', () => {
  return {
    __esModule: true,
    default: {
      blue: {
        bold: vi.fn(text => text)
      },
      bold: {
        red: vi.fn(text => text)
      }
    }
  };
});

// Mock Table
vi.mock('cli-table3', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => {
      return {
        toString: () => 'Mocked Table'
      };
    })
  };
});

describe('GitHubAuth', () => {
  let consoleLogSpy;
  let mockDeviceAuth;
  let mockVerificationCallback;
  let mockEnv;
  let mockEnviron;
  let openSpy;
  let tempConfigFile;
  
  beforeEach(() => {
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Setup mock device auth function
    mockDeviceAuth = vi.fn();
    mockVerificationCallback = null;
    
    octoDevAuth.createOAuthDeviceAuth.mockImplementation(options => {
      mockVerificationCallback = options.onVerification;
      return mockDeviceAuth;
    });
    
    // Create a temp config file path
    tempConfigFile = path.join(os.tmpdir(), 'test-config.ini');
    
    // Mock environment objects
    mockEnv = {
      clientId: 'mock-client-id',
      GitHub: {
        clientId: 'mock-github-client-id'
      }
    };
    
    // Create a proper mock environ object that mimics configparser behavior
    mockEnviron = {
      readConfig: vi.fn(() => {
        return {
          hasSection: vi.fn().mockReturnValue(true),
          hasKey: vi.fn().mockReturnValue(true),
          get: vi.fn().mockReturnValue('mock-token'),
          write: vi.fn().mockResolvedValue(true)
        };
      }),
      // Use a simpler function that ignores all parameters
      updateConfigSetting: vi.fn().mockImplementation(() => {
        // Return [success, updatedConfig] without referring to any parameters
        return [true, {}];
      })
    };
    
    // Reset mocks
    mockDeviceAuth.mockReset();
    
    // Create a clean spy for open
    openSpy = vi.fn(() => Promise.resolve());
    vi.mocked(openModule.default).mockImplementation(openSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up temp file if it exists
    if (fs.existsSync(tempConfigFile)) {
      fs.unlinkSync(tempConfigFile);
    }
  });

  describe('getAccessTokenDeviceFlow', () => {
    it('should request device authentication and return access token', async () => {
      // Setup
      const mockAccessToken = { token: 'mock-token' };
      mockDeviceAuth.mockResolvedValue(mockAccessToken);
      const mockVerificationData = {
        device_code: 'mock-device-code',
        user_code: 'mock-user-code',
        verification_uri: 'https://github.com/login/device'
      };
      
      // Create auth instance with no config file
      const auth = new GitHubAuth(mockEnv, mockEnviron, tempConfigFile, false);
      
      // Start the device flow process
      const promise = auth.getAccessTokenDeviceFlow();
      
      // Simulate the verification callback being triggered by GitHub
      mockVerificationCallback(mockVerificationData);
      
      // Wait for the process to complete
      const result = await promise;
      
      // Assertions
      expect(octoDevAuth.createOAuthDeviceAuth).toHaveBeenCalledWith({
        clientType: 'github-app',
        clientId: 'mock-github-client-id',
        onVerification: expect.any(Function)
      });
      
      expect(mockDeviceAuth).toHaveBeenCalledWith({ type: 'oauth' });
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(vi.mocked(openModule.default)).toHaveBeenCalledWith('https://github.com/login/device');
      
      // Verify the result includes token and device code
      expect(result).toEqual({
        token: 'mock-token',
        deviceCode: 'mock-device-code'
      });
    });
    
    it('should use clientId from config file when config exists', async () => {
      // Create a mock config file
      fs.writeFileSync(tempConfigFile, '[GitHub]\ntoken=mock-token\nauthType=deviceFlow\n');
      
      const mockAccessToken = { token: 'mock-token' };
      mockDeviceAuth.mockResolvedValue(mockAccessToken);
      
      // Create auth instance with config file
      const auth = new GitHubAuth(mockEnv, mockEnviron, tempConfigFile, true);
      
      // Start the device flow process
      const promise = auth.getAccessTokenDeviceFlow();
      
      // Verify the client ID used
      expect(octoDevAuth.createOAuthDeviceAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'mock-client-id'
        })
      );
      
      // Complete the process (needed to resolve the promise)
      mockVerificationCallback({
        device_code: 'mock-device-code',
        user_code: 'mock-user-code',
        verification_uri: 'https://github.com/login/device'
      });
      
      await promise;
    });
  });
});