process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/harbor_test';
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'harbor_test';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000';
