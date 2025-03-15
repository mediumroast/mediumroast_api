import dotenv from 'dotenv';

dotenv.config();

const config = {
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    port: process.env.PORT || 3000,
    dbConnectionString: process.env.DB_CONNECTION_STRING || 'mongodb://localhost:27017/mediumroast',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
};

export default config;