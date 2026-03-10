import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtGuards)
  @Get('me')
  async me(@Req() req: Request & { user: { sub: string } }) {
    return this.usersService.me(req.user.sub);
  }

  @UseGuards(JwtGuards)
  @Patch('update-me')
  async updateMe(
    @Body() updateMeDto: UpdateMeDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return await this.usersService.updateMe(updateMeDto, req.user.sub);
  }

  @UseGuards(JwtGuards)
  @Delete('delete-me')
  async deleteMe(@Req() req: Request & { user: { sub: string } }) {
    return await this.usersService.deleteMe(req.user.sub);
  }
}
