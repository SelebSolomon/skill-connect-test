import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  @Post()
  async submitBid(
    @Req() req: Request & { user: { sub: string } },
    @Body() createBidDto: CreateBidDto,
  ) {
    return this.bidsService.submitBid(createBidDto, req.user.sub);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  @Get('my-bids')
  async getMyBids(@Req() req: Request & { user: { sub: string } }) {
    return this.bidsService.getMyBids(req.user.sub);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  @Get(':id')
  async getBidById(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.bidsService.getBidById(id, req.user.sub);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  @Patch(':id')
  async updateBid(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
    @Body() updateBidDto: UpdateBidDto,
  ) {
    return this.bidsService.updateBid(id, updateBidDto, req.user.sub);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  @Delete(':id')
  async withdrawBid(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.bidsService.withdrawBid(id, req.user.sub);
  }
}
