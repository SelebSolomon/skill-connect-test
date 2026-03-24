import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WalletService } from './wallet.service';
import { DepositRequestDto } from './dto/deposit-request.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';
import { WalletTransactionType } from './schema/wallet-transaction.schema';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('wallet')
@UseGuards(JwtGuards, RolesGuard)
@Permissions([...RolePermissions[RoleName.Provider]])
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * GET /wallet
   * Returns the provider's current balance and lifetime totals.
   */
  @Get()
  getWallet(@Req() req: AuthenticatedRequest) {
    return this.walletService.getWallet(req.user.sub);
  }

  /**
   * POST /wallet/deposit
   * Provider submits a deposit request with an optional proof image.
   * Multipart: { amount, note? } + file field "proofImage"
   */
  @Post('deposit')
  @UseInterceptors(FileInterceptor('proofImage'))
  async requestDeposit(
    @Body() dto: DepositRequestDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() proofImage?: Express.Multer.File,
  ) {
    let proofImageUrl: string | undefined;
    let proofImagePublicId: string | undefined;

    if (proofImage) {
      const uploaded = await this.cloudinaryService.uploadImage(proofImage, "wallet");
      proofImageUrl = uploaded.url;
      proofImagePublicId = uploaded.publicId;
    }

    return this.walletService.requestDeposit(
      req.user.sub,
      dto,
      proofImageUrl,
      proofImagePublicId,
    );
  }

  /**
   * POST /wallet/deposit/initialize
   * Start a Paystack payment for a wallet deposit.
   * Body: { amount: number }
   */
  @Post('deposit/initialize')
  initializeDeposit(
    @Body('amount') amount: number,
    @Req() req: AuthenticatedRequest & { headers: Record<string, string> },
  ) {
    const origin = req.headers['origin'] ?? 'http://localhost:5173';
    const callbackUrl = `${origin}/wallet?verify=1`;
    return this.walletService.initializeDeposit(req.user.sub, Number(amount), callbackUrl);
  }

  /**
   * GET /wallet/deposit/verify?reference=xxx
   * Verify a completed Paystack deposit and credit wallet.
   */
  @Get('deposit/verify')
  verifyDeposit(@Query('reference') reference: string) {
    return this.walletService.verifyDeposit(reference);
  }

  /**
   * GET /wallet/history?type=deposit|deduction|refund&page=1&limit=20
   * Paginated list of the provider's wallet transactions.
   */
  @Get('history')
  getHistory(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: WalletTransactionType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getHistory(
      req.user.sub,
      type,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }
}
