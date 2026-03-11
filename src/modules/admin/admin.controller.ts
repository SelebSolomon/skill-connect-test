import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';
import { ReportStatus } from '../reports/schema/report.schema';
import { TransactionStatus } from '../transactions/schema/transaction.schema';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

class BanUserDto {
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  banned: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

class VerifyProviderDto {
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  verified: boolean;

  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

class FlagJobDto {
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  flagged: boolean;
}

class ResolveReportDto {
  @IsEnum([ReportStatus.Reviewed, ReportStatus.Dismissed, ReportStatus.Actioned])
  status: ReportStatus.Reviewed | ReportStatus.Dismissed | ReportStatus.Actioned;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

type AdminRequest = Request & { user: { sub: string } };

@Controller('admin')
@UseGuards(JwtGuards, RolesGuard)
@Permissions([...RolePermissions[RoleName.Admin]])
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly walletService: WalletService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  /**
   * GET /admin/stats
   * Returns: { totalUsers, totalJobs, activeProviders, totalRevenue, pendingReports }
   */
  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  /**
   * GET /admin/users?roleName=provider&banned=false&emailVerified=true&search=john&page=1&limit=20
   */
  @Get('users')
  getUsers(
    @Query('roleName') roleName?: RoleName,
    @Query('banned') banned?: string,
    @Query('emailVerified') emailVerified?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      roleName,
      banned: banned !== undefined ? banned === 'true' : undefined,
      emailVerified: emailVerified !== undefined ? emailVerified === 'true' : undefined,
      search,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  /**
   * GET /admin/users/:userId
   * Full user record including populated provider profile.
   */
  @Get('users/:userId')
  getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  /**
   * PATCH /admin/users/:userId/ban
   * Body: { banned: true|false, reason? }
   */
  @Patch('users/:userId/ban')
  banUser(@Param('userId') userId: string, @Body() dto: BanUserDto) {
    return this.adminService.setBanStatus(userId, dto.banned, dto.reason);
  }

  /**
   * PATCH /admin/users/:userId/verify
   * Verify or revoke a provider's profile verification.
   * Body: { verified: true|false, verificationNotes? }
   */
  @Patch('users/:userId/verify')
  verifyProvider(@Param('userId') userId: string, @Body() dto: VerifyProviderDto) {
    return this.adminService.setProviderVerified(userId, dto.verified, dto.verificationNotes);
  }

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  /**
   * GET /admin/jobs?status=open&flagged=true&page=1&limit=20
   */
  @Get('jobs')
  getJobs(
    @Query('status') status?: string,
    @Query('flagged') flagged?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getJobs({
      status,
      flagged: flagged !== undefined ? flagged === 'true' : undefined,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  /**
   * PATCH /admin/jobs/:jobId/flag
   * Body: { flagged: true|false }
   */
  @Patch('jobs/:jobId/flag')
  flagJob(@Param('jobId') jobId: string, @Body() dto: FlagJobDto) {
    return this.adminService.setJobFlagged(jobId, dto.flagged);
  }

  /**
   * DELETE /admin/jobs/:jobId
   * Permanently removes a job that violates platform policy.
   */
  @Delete('jobs/:jobId')
  deleteJob(@Param('jobId') jobId: string) {
    return this.adminService.deleteJob(jobId);
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  /**
   * GET /admin/transactions?status=pending&page=1&limit=20
   */
  @Get('transactions')
  getTransactions(
    @Query('status') status?: TransactionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTransactions({
      status,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  /**
   * GET /admin/reports?status=pending&page=1&limit=20
   */
  @Get('reports')
  getReports(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReports(status, page ? +page : 1, limit ? +limit : 20);
  }

  /**
   * PATCH /admin/reports/:reportId/resolve
   * Body: { status: "reviewed"|"dismissed"|"actioned", adminNotes? }
   */
  @Patch('reports/:reportId/resolve')
  resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminService.resolveReport(reportId, req.user.sub, dto.status, dto.adminNotes);
  }

  // ─── Wallet deposits ───────────────────────────────────────────────────────

  /**
   * GET /admin/wallet/deposits?page=1&limit=20
   * Lists pending deposit requests from providers awaiting approval.
   */
  @Get('wallet/deposits')
  getPendingDeposits(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.walletService.getPendingDeposits(page ? +page : 1, limit ? +limit : 20);
  }

  /**
   * PATCH /admin/wallet/deposits/:depositId/approve
   * Credits the provider's wallet balance.
   */
  @Patch('wallet/deposits/:depositId/approve')
  approveDeposit(@Param('depositId') depositId: string, @Req() req: AdminRequest) {
    return this.walletService.approveDeposit(depositId, req.user.sub);
  }

  /**
   * PATCH /admin/wallet/deposits/:depositId/reject
   * Body: { note? }
   */
  @Patch('wallet/deposits/:depositId/reject')
  rejectDeposit(
    @Param('depositId') depositId: string,
    @Body('note') note: string | undefined,
    @Req() req: AdminRequest,
  ) {
    return this.walletService.rejectDeposit(depositId, req.user.sub, note);
  }
}
