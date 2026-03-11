import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { Permission } from 'src/common/enums/permissions-enum';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('analytics')
@UseGuards(JwtGuards, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/provider
   * Returns: { totalJobs, completedJobs, completionRate, activeJobs,
   *            averageRating, totalReviews, isVerified, totalEarnings }
   */
  @Get('provider')
  @Permissions([Permission.ManageProviderProfile])
  getProviderStats(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getProviderStats(req.user.sub);
  }

  /**
   * GET /analytics/client
   * Returns: { totalJobsPosted, activeJobs, completedJobs, totalSpent }
   */
  @Get('client')
  @Permissions([Permission.ManageOwnJobs])
  getClientStats(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getClientStats(req.user.sub);
  }
}
