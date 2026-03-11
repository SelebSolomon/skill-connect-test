import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('reports')
@UseGuards(JwtGuards)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /reports
   * Any authenticated user reports a user or job.
   * Body: { targetType, targetId, reason, description? }
   */
  @Post()
  submitReport(
    @Body() dto: CreateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportsService.submitReport(dto, req.user.sub);
  }

  /**
   * GET /reports/mine?page=1&limit=20
   * Returns all reports submitted by the current user.
   */
  @Get('mine')
  getMyReports(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getMyReports(
      req.user.sub,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }
}
