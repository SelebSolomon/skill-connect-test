import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import { TransactionStatus } from './schema/transaction.schema';
import { MarkPaidDto, WaiveDto } from './dto/update-transaction.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // ─── Paystack webhook (no JWT — Paystack calls this) ────────────────────────

  @Post('webhook/paystack')
  @HttpCode(200)
  handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.transactionsService.handlePaystackWebhook(
      req.rawBody!,
      signature,
    );
  }

  // ─── Provider: own commission ledger ────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  getMyTransactions(
    @Req() req: Request & { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.getMyTransactions(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ─── Admin: platform revenue summary ────────────────────────────────────────

  @Get('summary')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  getPlatformSummary() {
    return this.transactionsService.getPlatformSummary();
  }

  // ─── Provider: verify Paystack payment after redirect ────────────────────────

  @Get('pay/verify')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  verifyPayment(@Query('reference') reference: string) {
    if (!reference) throw new Error('reference is required');
    return this.transactionsService.verifyPaystackPayment(reference);
  }

  // ─── Admin: all transactions ─────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.transactionsService.getAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  // ─── Provider: initialize Paystack payment for a commission ─────────────────

  @Post(':id/pay/initialize')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  initializePayment(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string; email: string }; headers: Record<string, string> },
    @Body('callbackUrl') callbackUrl?: string,
  ) {
    const origin = req.headers['origin'] ?? 'http://localhost:3000';
    const callback = callbackUrl ?? `${origin}/commission`;
    return this.transactionsService.initializePaystackPayment(
      id,
      req.user.email,
      callback,
    );
  }

  // ─── Admin: mark as paid ─────────────────────────────────────────────────────

  @Patch(':id/mark-paid')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  markAsPaid(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: MarkPaidDto,
  ) {
    return this.transactionsService.markAsPaid(id, req.user.sub, dto.paymentReference);
  }

  // ─── Admin: waive commission ─────────────────────────────────────────────────

  @Patch(':id/waive')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  waive(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: WaiveDto,
  ) {
    return this.transactionsService.waive(id, req.user.sub, dto.reason);
  }
}
