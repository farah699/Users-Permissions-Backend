import request from 'supertest';
import express from 'express';
import cors from 'cors';
import userRoutes from '../routes/users';
import { authenticateToken } from '../middleware/auth';
import { User } from '../models/User';
import { createTestUser, createTestRole, getAuthToken } from './setup';

// Setup test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', authenticateToken, userRoutes);

describe('Users Routes', () => {
  let adminUser: any;
  let adminToken: string;
  let testRole: any;

  beforeEach(async () => {
    // Create test role
    testRole = await createTestRole({ name: 'Test Role' });
    
    // Create admin user
    adminUser = await createTestUser({
      email: 'admin@test.com',
      roles: [testRole._id]
    });
    
    adminToken = await getAuthToken(adminUser);
  });

  describe('GET /api/users', () => {
    it('should get users list', async () => {
      // Create additional test users
      await createTestUser({ email: 'user1@test.com', firstName: 'User1' });
      await createTestUser({ email: 'user2@test.com', firstName: 'User2' });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should filter users by search', async () => {
      await createTestUser({ email: 'john@test.com', firstName: 'John', lastName: 'Doe' });
      await createTestUser({ email: 'jane@test.com', firstName: 'Jane', lastName: 'Smith' });

      const response = await request(app)
        .get('/api/users?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].firstName).toBe('John');
    });

    it('should paginate users', async () => {
      // Create multiple users
      for (let i = 0; i < 15; i++) {
        await createTestUser({ email: `user${i}@test.com` });
      }

      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeLessThanOrEqual(10);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.totalPages).toBeGreaterThan(1);
    });
  });

  describe('POST /api/users', () => {
    it('should create new user', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'NewUser123!',
        firstName: 'New',
        lastName: 'User',
        roles: [testRole._id]
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      
      // Verify user was created in database
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: adminUser.email, // Use existing email
        password: 'Test123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid' }); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const testUser = await createTestUser({ email: 'update@test.com' });
      
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const testUser = await createTestUser({ email: 'delete@test.com' });

      const response = await request(app)
        .delete(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify user was deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });
  });
});