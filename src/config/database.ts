import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  // Skip MongoDB in production if requested
  if (process.env.SKIP_MONGODB === 'true') {
    console.log('⚠️ MongoDB connection skipped (SKIP_MONGODB=true)');
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/users_permissions_db';
    
    await mongoose.connect(mongoURI, {
      // Remove deprecated options
    });

    console.log('✅ MongoDB Connected Successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // DON'T EXIT - Continue without database in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Continuing without MongoDB in production mode...');
      return;
    }
    process.exit(1);
  }
};