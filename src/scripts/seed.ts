import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';

// Load environment variables
dotenv.config();

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data (optional - be careful in production!)
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Permission.deleteMany({})
    ]);

    // 1. Create Permissions
    console.log('📋 Creating permissions...');
    const permissionsData = (Permission as any).getCommonPermissions();
    const permissions = await Permission.insertMany(permissionsData);
    console.log(`✅ Created ${permissions.length} permissions`);

    // Create permission map for easy reference
    const permissionMap = new Map();
    permissions.forEach(permission => {
      const key = `${permission.resource}:${permission.action}`;
      permissionMap.set(key, permission._id);
    });

    // 2. Create Roles
    console.log('👥 Creating roles...');
    
    // Super Admin Role - All permissions
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      permissions: permissions.map(p => p._id),
      isActive: true
    });

    // Admin Role - Most permissions except super admin specific ones
    const adminPermissions = permissions
      .filter(p => !(p.resource === 'permission' && p.action === 'manage'))
      .map(p => p._id);
    
    const adminRole = await Role.create({
      name: 'Admin',
      description: 'Administrative access with most permissions',
      permissions: adminPermissions,
      isActive: true
    });

    // Manager Role - User and role management
    const managerPermissions = [
      'user:read', 'user:update', 'user:create',
      'role:read', 'permission:read'
    ].map(key => permissionMap.get(key)).filter(Boolean);

    const managerRole = await Role.create({
      name: 'Manager',
      description: 'Management access with limited permissions',
      permissions: managerPermissions,
      isActive: true
    });

    // User Role - Basic permissions
    const userPermissions = [
      'user:read', 'role:read', 'permission:read'
    ].map(key => permissionMap.get(key)).filter(Boolean);

    const userRole = await Role.create({
      name: 'User',
      description: 'Basic user access with minimal permissions',
      permissions: userPermissions,
      isActive: true
    });

    // Guest Role - Read-only access
    const guestPermissions = [
      'user:read', 'role:read', 'permission:read'
    ].map(key => permissionMap.get(key)).filter(Boolean);

    const guestRole = await Role.create({
      name: 'Guest',
      description: 'Read-only access for guests',
      permissions: guestPermissions,
      isActive: true
    });

    console.log('✅ Created 5 roles');

    // 3. Create Users
    console.log('👤 Creating users...');

    // Super Admin User
    const superAdmin = await User.create({
      email: 'admin@opuslab.com',
      password: 'Admin123!@#',
      firstName: 'Super',
      lastName: 'Admin',
      roles: [superAdminRole._id],
      isActive: true,
      isEmailVerified: true
    });

    // Admin User
    const admin = await User.create({
      email: 'admin.user@opuslab.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      roles: [adminRole._id],
      isActive: true,
      isEmailVerified: true
    });

    // Manager User
    const manager = await User.create({
      email: 'manager@opuslab.com',
      password: 'Manager123!',
      firstName: 'Manager',
      lastName: 'User',
      roles: [managerRole._id],
      isActive: true,
      isEmailVerified: true
    });

    // Regular Users
    const users = await User.insertMany([
      {
        email: 'john.doe@opuslab.com',
        password: 'User123!',
        firstName: 'John',
        lastName: 'Doe',
        roles: [userRole._id],
        isActive: true,
        isEmailVerified: true
      },
      {
        email: 'jane.smith@opuslab.com',
        password: 'User123!',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [userRole._id],
        isActive: true,
        isEmailVerified: true
      },
      {
        email: 'mike.johnson@opuslab.com',
        password: 'User123!',
        firstName: 'Mike',
        lastName: 'Johnson',
        roles: [userRole._id, managerRole._id], // Multiple roles
        isActive: true,
        isEmailVerified: true
      },
      {
        email: 'sarah.wilson@opuslab.com',
        password: 'User123!',
        firstName: 'Sarah',
        lastName: 'Wilson',
        roles: [guestRole._id],
        isActive: true,
        isEmailVerified: true
      },
      {
        email: 'inactive.user@opuslab.com',
        password: 'User123!',
        firstName: 'Inactive',
        lastName: 'User',
        roles: [userRole._id],
        isActive: false, // Inactive user for testing
        isEmailVerified: false
      }
    ]);

    console.log(`✅ Created ${users.length + 3} users`);

    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log('==================');
    console.log(`Permissions: ${permissions.length}`);
    console.log(`Roles: 5`);
    console.log(`Users: ${users.length + 3}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('==================');
    console.log('Super Admin:');
    console.log('  Email: admin@opuslab.com');
    console.log('  Password: Admin123!@#');
    console.log('');
    console.log('Admin User:');
    console.log('  Email: admin.user@opuslab.com');
    console.log('  Password: Admin123!');
    console.log('');
    console.log('Manager:');
    console.log('  Email: manager@opuslab.com');
    console.log('  Password: Manager123!');
    console.log('');
    console.log('Regular User:');
    console.log('  Email: john.doe@opuslab.com');
    console.log('  Password: User123!');

    console.log('\n🎉 Database seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;