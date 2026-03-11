import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('settings')
@UseGuards(JwtGuards)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings
   * Returns the current user's settings (or auto-creates defaults).
   */
  @Get()
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getSettings(req.user.sub);
  }

  /**
   * PATCH /settings
   * Update notification channel preferences.
   * Body: { emailNotifications?, pushNotifications?, smsNotifications? }
   */
  @Patch()
  updateNotifications(
    @Body() dto: UpdateNotificationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settingsService.updateNotifications(req.user.sub, dto);
  }

  /**
   * PATCH /settings/location
   * Update location sharing preferences.
   * Body: { shareLocation?, locationRadius? }
   */
  @Patch('location')
  updateLocation(
    @Body() dto: UpdateLocationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settingsService.updateLocation(req.user.sub, dto);
  }
}
