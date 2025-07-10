import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL is not provided in the environment variables');
}

// TypeORM configuration for Neon PostgreSQL
const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres', // Changed from 'mysql' to 'postgres'
  url: dbUrl,
  ssl: {
    rejectUnauthorized: false, // Neon requires SSL but with self-signed certificates
  },
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true, // Turn off auto-synchronization in production
  dropSchema: false, // Don't drop schema in production
  logging: process.env.NODE_ENV === 'development', // Enable logging in development
  
  // Additional PostgreSQL-specific configurations
  extra: {
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
  },
};

export default typeOrmConfig;

/*
Steps to clear the data and start from teh fresh
0) step 0 is the initial step where you need to check the db and also the status of hte dropScheme
and the synchronize set to false because this will cause a big if both are true or any oen of is true initially.
1) first set the dropSchem in teh config to true it will delete all the data with tables but let synchronize set to false 
2) second set the dropSchem in teh config to false and then set the synchronize to true it will recreate teh schema based on teh entities we entered.
3) third check the bd if all the tbales are created or not and also there structure if not then repeat this process.
4) and at last stop the application in each step to properly let the process happen without any errors. 
5) and finally set both dropSchem and synchronize to false and start the application this will start the application from scratch.

Note: do not set dropSchem and synchronize to true at once becuase one will create and another one will delete this will happened 
one after the another.

Thank you 💘
*/