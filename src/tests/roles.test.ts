import request from 'supertest';
import express from 'express';
import cors from 'cors';
import roleRoutes from '../routes/roles';
import { authenticateToken } from '../middleware/auth';
import { Role } from '../models/Role';
import { createTestUser, createTestRole, createTestPermission, getAuthToken } from './setup';

// Setup test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/roles', authenticateToken, roleRoutes);

describe('Roles Routes', () => {
  let adminUser: any;
  let adminToken: string;
  let testPermission: any;

  beforeEach(async () => {
    // Create admin user
    adminUser = await createTestUser({ email: 'admin@test.com' });
    adminToken = await getAuthToken(adminUser);
    
    // Create test permission
    testPermission = await createTestPermission({
      name: 'Test Permission',
      resource: 'user',
      action: 'read'
    });
  });

  describe('GET /api/roles', () => {
    it('should get roles list', async () => {
      // Create test roles
      await createTestRole({ name: 'Admin Role', description: 'Admin access' });
      await createTestRole({ name: 'User Role', description: 'User access' });

      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toBeDefined();
      expect(response.body.data.roles.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter roles by search', async () => {
      await createTestRole({ name: 'Admin Role' });
      await createTestRole({ name: 'User Role' });
      await createTestRole({ name: 'Manager Role' });

      const response = await request(app)
        .get('/api/roles?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.roles.length).toBe(1);
      expect(response.body.data.roles[0].name).toBe('Admin Role');
    });
  });

  describe('POST /api/roles', () => {
    it('should create new role', async () => {
      const roleData = {
        name: 'New Role',
        description: 'New role description',
        permissions: [testPermission._id]
      };

      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role.name).toBe(roleData.name);
      expect(response.body.data.role.description).toBe(roleData.description);
      
      // Verify role was created in database
      const createdRole = await Role.findOne({ name: roleData.name });
      expect(createdRole).toBeTruthy();
    });

    it('should reject duplicate role name', async () => {
      await createTestRole({ name: 'Duplicate Role' });
      
      const roleData = {
        name: 'Duplicate Role',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('should update role', async () => {
      const testRole = await createTestRole({ name: 'Update Role' });
      
      const updateData = {
        name: 'Updated Role',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/roles/${testRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role.name).toBe('Updated Role');
      expect(response.body.data.role.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should delete role', async () => {
      const testRole = await createTestRole({ name: 'Delete Role' });

      const response = await request(app)
        .delete(`/api/roles/${testRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify role was deleted
      const deletedRole = await Role.findById(testRole._id);
      expect(deletedRole).toBeNull();
    });
  });

  describe('PUT /api/roles/:id/permissions', () => {
    it('should update role permissions', async () => {
      const testRole = await createTestRole({ name: 'Permission Role' });
      const permission2 = await createTestPermission({
        name: 'Another Permission',
        resource: 'role',
        action: 'create'
      });
      
      const permissionIds = [testPermission._id, permission2._id];

      const response = await request(app)
        .put(`/api/roles/${testRole._id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: permissionIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role.permissions.length).toBe(2);
    });
  });
});