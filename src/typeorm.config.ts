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
  synchronize:false , // Turn off auto-synchronization if false 
  dropSchema:false, // use this to drop all the data and tables at once but not in production.
 
  // for local host
  // type:"mysql",
  // host:"localhost",
  // username:'root',
  // password:"", 
  // database:"tracktime_db",
  // entities:[__dirname + "/**/*.entity{.ts,.js}"],
  // synchronize:false
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