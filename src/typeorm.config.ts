import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL is not provided in the environment variables');
}

// Extract the 'rejectUnauthorized' parameter from DATABASE_URL
const rejectUnauthorized = dbUrl.includes('rejectUnauthorized=true');

// TypeORM configuration with SSL
const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  url: dbUrl,
  extra: {
    ssl: {
      rejectUnauthorized: rejectUnauthorized,
    },
  },
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // Turn off auto-synchronization
};

export default typeOrmConfig;
