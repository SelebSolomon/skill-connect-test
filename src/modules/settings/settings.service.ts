import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSettings, UserSettingsDocument } from './schema/user-settings.schema';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(UserSettings.name)
    private readonly settingsModel: Model<UserSettingsDocument>,
  ) {}

  /** Returns existing settings or creates defaults on first access */
  async getSettings(userId: string): Promise<UserSettingsDocument> {
    return this.settingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {},           // no changes — just upsert the default document
      { new: true, upsert: true },
    ) as Promise<UserSettingsDocument>;
  }

  /** Update which notification channels are active */
  async updateNotifications(
    userId: string,
    dto: UpdateNotificationsDto,
  ): Promise<UserSettingsDocument> {
    return this.settingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: dto },
      { new: true, upsert: true },
    ) as Promise<UserSettingsDocument>;
  }

  /** Update location sharing radius */
  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<UserSettingsDocument> {
    return this.settingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: dto },
      { new: true, upsert: true },
    ) as Promise<UserSettingsDocument>;
  }
}
