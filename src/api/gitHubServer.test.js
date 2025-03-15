import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Studies, Companies, Interactions, Users, Storage, Actions } from './gitHubServer.js';

// Mock the GitHub Functions module
vi.mock('./github.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      readObjects: vi.fn(),
      getAllUsers: vi.fn(),
      getUser: vi.fn(),
      getRepoSize: vi.fn(),
      getStorageBillings: vi.fn(),
      getActionsBillings: vi.fn(),
      getWorkflowRuns: vi.fn(),
      invalidateCache: vi.fn(),
      catchContainer: vi.fn(),
      getSha: vi.fn(),
      writeObject: vi.fn(),
      releaseContainer: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      writeBlob: vi.fn(),
      checkForLock: vi.fn()
    }))
  };
});

describe('GitHubServer', () => {
  // Common test variables
  const token = 'test-token';
  const org = 'test-org';
  const processName = 'test-process';
  
  // Mock response data
  const mockStudies = { 
    mrJson: [
      { name: 'Study 1', description: 'Test study 1', status: 'active' },
      { name: 'Study 2', description: 'Test study 2', status: 'inactive' }
    ]
  };
  
  const mockCompanies = { 
    mrJson: [
      { 
        name: 'Company 1', 
        description: 'Test company 1', 
        status: 'active',
        linked_interactions: { 'Interaction 1': 'hash1' }
      },
      { 
        name: 'Company 2', 
        description: 'Test company 2', 
        status: 'inactive',
        linked_interactions: {}
      }
    ]
  };
  
  const mockInteractions = { 
    mrJson: [
      { 
        name: 'Interaction 1', 
        description: 'Test interaction 1',
        file_hash: 'hash123',
        content_type: 'pdf'
      },
      { 
        name: 'Interaction 2', 
        description: 'Test interaction 2',
        file_hash: 'hash456',
        content_type: 'doc'
      }
    ]
  };
  
  const mockUsers = [
    { login: 'user1', name: 'User One', email: 'user1@example.com' },
    { login: 'user2', name: 'User Two', email: 'user2@example.com' }
  ];
  
  const mockCurrentUser = { 
    login: 'current-user', 
    name: 'Current User', 
    email: 'current@example.com' 
  };
  
  const mockStorage = {
    size: 100,
    files: 50
  };
  
  const mockStorageBilling = {
    days_left_in_billing_cycle: 20,
    estimated_paid_storage_for_month: 5,
    estimated_storage_for_month: 10
  };
  
  const mockActionsBilling = {
    total_minutes_used: 300,
    total_paid_minutes_used: 100,
    included_minutes: 2000
  };
  
  const mockWorkflows = [
    { id: 1, name: 'Workflow 1', status: 'completed' },
    { id: 2, name: 'Workflow 2', status: 'in_progress' }
  ];
  
  // Test suite for base class (using Studies as the concrete implementation)
  describe('Base Operations', () => {
    let studies;
    
    beforeEach(() => {
      // Reset mock implementation
      vi.clearAllMocks();
      
      // Create instance
      studies = new Studies(token, org, processName);
      
      // Setup successful mock responses
      studies.serverCtl.readObjects.mockResolvedValue([true, 'Success', mockStudies, 200]);
    });
    
    describe('getAll()', () => {
      it('should return all studies when successful', async () => {
        const result = await studies.getAll();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockStudies);
        expect(studies.serverCtl.readObjects).toHaveBeenCalledWith('Studies');
      });
      
      it('should handle API errors properly', async () => {
        studies.serverCtl.readObjects.mockResolvedValue([false, 'API Error', null, 500]);
        
        const result = await studies.getAll();
        
        expect(result[0]).toBe(false);
        expect(result[1].status_code).toBe(500);
        expect(result[1].status_msg).toContain('Failed to retrieve Studies');
      });
    });
    
    describe('findByName()', () => {
      it('should find studies by name', async () => {
        const result = await studies.findByName('Study 1');
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(1);
        expect(result[2][0].name).toBe('Study 1');
      });
      
      it('should return error when no studies match the name', async () => {
        const result = await studies.findByName('Nonexistent Study');
        
        expect(result[0]).toBe(false);
        expect(result[1].status_code).toBe(404);
      });
    });
    
    describe('findByX()', () => {
      it('should find studies by arbitrary attribute', async () => {
        const result = await studies.findByX('status', 'active');
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(1);
        expect(result[2][0].status).toBe('active');
      });
      
      it('should return error when attribute is invalid', async () => {
        const result = await studies.findByX('', 'value');
        
        expect(result[0]).toBe(false);
        expect(result[1].status_msg).toContain('Invalid parameter');
      });
    });
    
    describe('search()', () => {
      it('should search with filters', async () => {
        const result = await studies.search({ status: 'active' });
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(1);
        expect(result[2][0].status).toBe('active');
      });
      
      it('should apply name filter case-insensitively', async () => {
        const result = await studies.search({ name: 'study' });
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(2); // Both studies contain "study" in their name
      });
      
      it('should apply sorting options', async () => {
        // First update mock data to have sortable fields
        studies.serverCtl.readObjects.mockResolvedValue([
          true, 
          'Success', 
          { 
            mrJson: [
              { name: 'Study Z', order: 3 },
              { name: 'Study A', order: 1 },
              { name: 'Study M', order: 2 }
            ]
          },
          200
        ]);
        
        // Test sorting by name ascending (default)
        const resultNameAsc = await studies.search({}, { sort: 'name' });
        expect(resultNameAsc[2][0].name).toBe('Study A');
        expect(resultNameAsc[2][2].name).toBe('Study Z');
        
        // Test sorting by name descending
        const resultNameDesc = await studies.search({}, { sort: 'name', descending: true });
        expect(resultNameDesc[2][0].name).toBe('Study Z');
        expect(resultNameDesc[2][2].name).toBe('Study A');
        
        // Test sorting by numeric field
        const resultOrderAsc = await studies.search({}, { sort: 'order' });
        expect(resultOrderAsc[2][0].order).toBe(1);
        expect(resultOrderAsc[2][2].order).toBe(3);
      });
      
      it('should apply limit option', async () => {
        const result = await studies.search({}, { limit: 1 });
        
        expect(result[2]).toHaveLength(1);
      });
    });
  });
  
  // Test suite for Users class
  describe('Users Operations', () => {
    let users;
    
    beforeEach(() => {
      vi.clearAllMocks();
      users = new Users(token, org, processName);
      
      // Setup successful mock responses
      users.serverCtl.getAllUsers.mockResolvedValue([true, 'Success', mockUsers, 200]);
      users.serverCtl.getUser.mockResolvedValue([true, 'Success', mockCurrentUser, 200]);
    });
    
    describe('getAll()', () => {
      it('should return all users when successful', async () => {
        const result = await users.getAll();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockUsers);
        expect(users.serverCtl.getAllUsers).toHaveBeenCalled();
      });
    });
    
    describe('getMyself()', () => {
      it('should return current user info', async () => {
        const result = await users.getMyself();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockCurrentUser);
        expect(users.serverCtl.getUser).toHaveBeenCalled();
      });
    });
    
    describe('findByX()', () => {
      it('should find users by login attribute', async () => {
        const result = await users.findByX('login', 'user1');
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(1);
        expect(result[2][0].login).toBe('user1');
      });
    });
  });
  
  // Test suite for Storage class
  describe('Storage Operations', () => {
    let storage;
    
    beforeEach(() => {
      vi.clearAllMocks();
      storage = new Storage(token, org, processName);
      
      // Setup successful mock responses
      storage.serverCtl.getRepoSize.mockResolvedValue([true, 'Success', mockStorage, 200]);
      storage.serverCtl.getStorageBillings.mockResolvedValue([true, 'Success', mockStorageBilling, 200]);
    });
    
    describe('getAll()', () => {
      it('should return repo size info', async () => {
        const result = await storage.getAll();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockStorage);
        expect(storage.serverCtl.getRepoSize).toHaveBeenCalled();
      });
    });
    
    describe('getStorageBilling()', () => {
      it('should return storage billing info', async () => {
        const result = await storage.getStorageBilling();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockStorageBilling);
        expect(storage.serverCtl.getStorageBillings).toHaveBeenCalled();
      });
    });
  });
  
  // Test suite for Companies class (focusing on unique behavior)
  describe('Companies Operations', () => {
    let companies;
    
    beforeEach(() => {
      vi.clearAllMocks();
      companies = new Companies(token, org, processName);
      
      // Setup successful mock responses
      companies.serverCtl.readObjects.mockResolvedValue([true, 'Success', mockCompanies, 200]);
    });
    
    describe('getAll()', () => {
      it('should return all companies', async () => {
        const result = await companies.getAll();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockCompanies);
      });
    });
  });
  
  // Test suite for Interactions class
  describe('Interactions Operations', () => {
    let interactions;
    
    beforeEach(() => {
      vi.clearAllMocks();
      interactions = new Interactions(token, org, processName);
      
      // Setup successful mock responses
      interactions.serverCtl.readObjects.mockResolvedValue([true, 'Success', mockInteractions, 200]);
    });
    
    describe('findByHash()', () => {
      it('should find interactions by file hash', async () => {
        const result = await interactions.findByHash('hash123');
        
        expect(result[0]).toBe(true);
        expect(result[2]).toHaveLength(1);
        expect(result[2][0].file_hash).toBe('hash123');
      });
      
      it('should return error when no interactions match the hash', async () => {
        const result = await interactions.findByHash('nonexistent-hash');
        
        expect(result[0]).toBe(false);
        expect(result[1].status_code).toBe(404);
      });
    });
  });
  
  // Test suite for Actions class
  describe('Actions Operations', () => {
    let actions;
    
    beforeEach(() => {
      vi.clearAllMocks();
      actions = new Actions(token, org, processName);
      
      // Setup successful mock responses
      actions.serverCtl.getWorkflowRuns.mockResolvedValue([true, 'Success', mockWorkflows, 200]);
      actions.serverCtl.getActionsBillings.mockResolvedValue([true, 'Success', mockActionsBilling, 200]);
    });
    
    describe('getAll()', () => {
      it('should return all workflow runs', async () => {
        const result = await actions.getAll();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockWorkflows);
        expect(actions.serverCtl.getWorkflowRuns).toHaveBeenCalled();
      });
    });
    
    describe('getActionsBilling()', () => {
      it('should return actions billing info', async () => {
        const result = await actions.getActionsBilling();
        
        expect(result[0]).toBe(true);
        expect(result[2]).toEqual(mockActionsBilling);
        expect(actions.serverCtl.getActionsBillings).toHaveBeenCalled();
      });
    });
  });
});