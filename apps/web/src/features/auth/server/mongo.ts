import { MongoClient, type Db } from 'mongodb';
import { getServerAuthEnv } from './env';

declare global {
  var _harborMongoClient: MongoClient | undefined;
}

const env = getServerAuthEnv();

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  if (!global._harborMongoClient) {
    global._harborMongoClient = new MongoClient(env.MONGODB_URI);
  }
  client = global._harborMongoClient;
} else {
  client = new MongoClient(env.MONGODB_URI);
}

const db: Db = client.db(env.MONGODB_DB_NAME);

export { client as mongoClient, db as mongoDb };
