import { Injectable, Logger } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';

@Injectable()
export class TenantConnectionService {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly connections: Record<string, Connection> = {};

  async getTenantConnection(dbName: string): Promise<Connection> {
    if (this.connections[dbName]) return this.connections[dbName];

    const coreURL = process.env.MONGODB_BASE_URI;
    if (!coreURL) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    const connectionURL = `${coreURL}/${dbName}`;
    const connection = await mongoose.createConnection(connectionURL);

    connection.on('connected', () => {
      this.logger.log(`[Tenant DB: ${dbName}] Connected`);
    });

    connection.on('error', (err) => {
      this.logger.error(`[Tenant DB: ${dbName}] Connection error:`, err);
    });

    this.connections[dbName] = connection;
    return connection;
  }
}
