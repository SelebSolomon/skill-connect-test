import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/profile.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { Request } from 'express';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';
import { RolesGuard } from 'src/core/guards/role.guards';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { multerOptions } from 'src/core/config/multer.config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryProfilesDto } from './dto/query.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get my profile
   */
  @UseGuards(JwtGuards)
  @Get('me')
  async getMyProfile(@Req() req: { user: { sub: string } }) {
    return await this.profileService.getMyProfile(req.user.sub);
  }

  /**
   * Create my profile
   */

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'portfolioImages', maxCount: 5 },
      ],
      multerOptions,
    ),
  )
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  async createProfile(
    @Req() req: Request & { user: { sub: string } },
    @Body() createProfileDto: CreateProfileDto,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      portfolioImages?: Express.Multer.File[];
    },
  ) {
    console.log('Files object:', files);
    console.log('Photo:', files?.photo);
    console.log('Portfolio:', files?.portfolioImages);
    console.log('Raw req.files:', req['files']);

    return await this.profileService.createProfile(
      req.user.sub,
      createProfileDto,
      files,
    );
  }

  /**
   * update profile
   */

  @Patch('me')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'portfolioImages', maxCount: 5 },
      ],
      multerOptions,
    ),
  )
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  async updateProfile(
    @Req() req: Request & { user: { sub: string } },
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles()
    files?: {
      photo?: Express.Multer.File[];
      portfolioImages?: Express.Multer.File[];
    },
  ) {
    return this.profileService.updateProfile(
      req.user.sub,
      updateProfileDto,
      files,
    );
  }

  /**
   * Update profile photo
   */

  @Patch('me/photo')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  async updateProfilePhoto(
    @Req() req: Request & { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    return this.profileService.updateProfilePhoto(req.user.sub, file);
  }

  /**
   * Delete profile photo
   */
  @Delete('me/photo')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Provider]])
  async deleteProfilePhoto(@Req() req: Request & { user: { sub: string } }) {
    return this.profileService.deleteProfilePhoto(req.user.sub);
  }

  /**
   * Create my profile
   */

  @Get(':userId')
  async getProfileByUserId(@Param('userId') userId: string) {
    return this.profileService.getProfileByUserId(userId);
  }

  @Get()
  async queryProfile(@Query() query: QueryProfilesDto) {
    return this.profileService.queryProfiles(query);
  }
}
