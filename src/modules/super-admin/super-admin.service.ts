import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);
}
