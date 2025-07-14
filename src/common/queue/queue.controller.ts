import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { QueueService } from './queue.service';

@ApiTags('Queue')
@ApiBearerAuth()
@Controller('queue')
@UseGuards(JwtAuthGuard, RoleGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('mail/stats')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get mail queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Mail queue statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        waiting: { type: 'number' },
        active: { type: 'number' },
        completed: { type: 'number' },
        failed: { type: 'number' },
      },
    },
  })
  async getMailQueueStats() {
    return this.queueService.getQueueStats();
  }
}
