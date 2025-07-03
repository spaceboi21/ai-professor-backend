import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantService {
  async getTenantDbName(schoolName: string): Promise<string> {
    // Just return mock dbName by school
    const mockMapping = {
      Greenwood: 'tenant_greenwood',
      Riverside: 'tenant_riverside',
    };

    const dbName = mockMapping[schoolName];
    if (!dbName) throw new Error(`No DB found for school: ${schoolName}`);
    return dbName;
  }
}
