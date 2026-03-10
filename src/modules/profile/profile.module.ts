import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './schema/profile.schema';
import { Reflector } from '@nestjs/core';
// import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    UsersModule,
    ServicesModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, Reflector, CloudinaryService],
  exports: [ProfileService],
})
export class ProfileModule {}
