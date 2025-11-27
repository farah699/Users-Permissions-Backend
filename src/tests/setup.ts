import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { AuditLog } from '../models/AuditLog';

let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean database before each test
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    AuditLog.deleteMany({})
  ]);
});

// Helper function to create test user
export const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'test@example.com',
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isEmailVerified: true
  };
  
  return await User.create({ ...defaultUserData, ...userData });
};

// Helper function to create test role
export const createTestRole = async (roleData = {}) => {
  const defaultRoleData = {
    name: 'Test Role',
    description: 'Test role description',
    permissions: [],
    isActive: true
  };
  
  return await Role.create({ ...defaultRoleData, ...roleData });
};

// Helper function to create test permission
export const createTestPermission = async (permissionData = {}) => {
  const defaultPermissionData = {
    name: 'Test Permission',
    resource: 'test',
    action: 'read',
    description: 'Test permission description'
  };
  
  return await Permission.create({ ...defaultPermissionData, ...permissionData });
};

// Helper function to get JWT token for testing
export const getAuthToken = async (user: any) => {
  return user.generateAccessToken();
};