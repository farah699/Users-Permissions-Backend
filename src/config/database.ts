import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/users_permissions_db';
    
    // Set connection options for MongoDB Atlas
    const options = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10,
      minPoolSize: 1,
    };
    
    console.log('🔄 Attempting MongoDB connection...');
    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB Connected Successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    // In production, throw the error to be handled by caller
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    process.exit(1);
  }
};