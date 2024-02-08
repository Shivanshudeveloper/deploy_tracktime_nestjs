// ormconfig.js
module.exports = {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'tracktime_db',
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: true,
  };
  