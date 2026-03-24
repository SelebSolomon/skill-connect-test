import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Profile, ProfileDocument } from './schema/profile.schema';
import { Model, Types } from 'mongoose';
import { CreateProfileDto } from './dto/profile.dto';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';
import { PortfolioItemDto } from './dto/portfolio.dto';
import { ServicesService } from '../services/services.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryProfilesDto } from './dto/query.dto';
import { LocationDto } from './dto/location.dto';

@Injectable()
export class ProfileService {
private logger = new Logger(ProfileService.name);
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private cloudinaryService: CloudinaryService,
    private userService: UsersService,
    private servicesService: ServicesService,
  ) {}

  async createProfile(
    userId: string,
    createProfileDto: CreateProfileDto,
    files?: {
      photo?: Express.Multer.File[];
      portfolioImages?: Express.Multer.File[];
    },
  ) {
    // Check if profile already exists
    const profile = await this.profileModel.findOne({ userId });
    if (profile) {
      throw new BadRequestException('Profile already exists');
    }

    let photoUrl: string | undefined;
    let photoPublicId: string | undefined;

    // Upload profile photo
    if (files?.photo?.[0]) {
      const uploaded = await this.cloudinaryService.uploadImage(
        files.photo[0],
        'profile',
      );
      photoUrl = uploaded.url;
      photoPublicId = uploaded.publicId;
    }

    // Upload portfolio images
    const portfolio = await this.processPortfolio(
      createProfileDto.portfolio || [],
      files?.portfolioImages || [],
    );

    // Location
    const location = createProfileDto.location
      ? this.buildLocationData(createProfileDto.location)
      : undefined;

    // Validate and get service categories
    let categories: string[] = [];
    let validatedServices: string[] = [];

    if (createProfileDto.services && createProfileDto.services.length > 0) {
      const result = await this.validateAndExtractCategories(
        createProfileDto.services,
      );
      categories = result.categories;
      validatedServices = result.serviceIds;
    }

    // Build profile data
    const profileData = {
      userId,
      title: createProfileDto.title,
      bio: createProfileDto.bio,
      rate: createProfileDto.rate ?? 0,
      skills: createProfileDto.skills || [],
      services: validatedServices,
      categories, // Auto-extracted from services
      location,
      portfolio,
      photoUrl: photoUrl || createProfileDto.photoUrl,
      photoPublicId: photoPublicId || createProfileDto.photoPublicId,
      verified: false,
      ratingAvg: 0,
      ratingCount: 0,
    };

    // Validation - at least one meaningful field
    const hasMeaningfulData =
      profileData.bio ||
      profileData.skills.length > 0 ||
      profileData.services.length > 0 ||
      portfolio.length > 0 ||
      profileData.photoUrl;

    if (!hasMeaningfulData) {
      throw new BadRequestException(
        'Profile must have at least: bio, skills, services, photo, or portfolio',
      );
    }

    // Create profile
    const newProfile = await this.profileModel.create(profileData);

    // Increment service popularity counts
    if (validatedServices.length > 0) {
      await this.incrementServicePopularity(validatedServices);
    }

    // Mark user profile as completed
    await this.markUserProfileCompleted(userId);

    return {
      ...newProfile.toObject(),
      canReceiveJobs: true,
    };
  }

  /**
   * Validate service IDs and extract their categories
   */
  private async validateAndExtractCategories(
    serviceIds: string[],
  ): Promise<{ serviceIds: string[]; categories: string[] }> {
    const services = await this.servicesService.validateServiceIds(serviceIds);

    if (services.length === 0) {
      throw new BadRequestException('No valid services found');
    }

    // Extract unique categories
    const categories = [...new Set(services.map((s) => s.category))];

    return {
      serviceIds: services.map((s) => s._id.toString()),
      categories,
    };
  }

  /**
   * Increment popularity count for all selected services
   */
  private async incrementServicePopularity(
    serviceIds: string[],
  ): Promise<void> {
    const incrementPromises = serviceIds.map((serviceId) =>
      this.servicesService.incrementPopularity(serviceId),
    );
    await Promise.all(incrementPromises);
  }

  /**
   * Process portfolio items and upload images
   */
  private async processPortfolio(
    portfolioDto: PortfolioItemDto[],
    files: Express.Multer.File[],
  ): Promise<PortfolioItemDto[]> {
    const portfolio: PortfolioItemDto[] = [];

    // Process all portfolio items, not just ones with files
    for (let i = 0; i < portfolioDto.length; i++) {
      const item = { ...portfolioDto[i] };
      const file = files[i]; // might be undefined

      if (file) {
        const uploaded = await this.cloudinaryService.uploadImage(
          file,
          'portfolio',
        );
        item.imageUrl = uploaded.url;
        item.publicId = uploaded.publicId;
      }

      const hasContent = !!(
        item.title ||
        item.description ||
        item.imageUrl ||
        item.link
      );

      if (hasContent) {
        portfolio.push(item);
      }
    }

    return portfolio;
  }

  /**
   * Mark user's profile as completed
   */
  private async markUserProfileCompleted(userId: string): Promise<void> {
    await this.userService.update(userId, { profileCompleted: true });
  }


 

  /**
   * Get my profile
   */

  async getMyProfile(userId: string) {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = await this.profileModel
      .findOne({ userId })
      .select(
        'title bio rate skills photoUrl ratingAvg ratingCount categories location portfolio',
      )
      .populate('services');

    if (!profile) {
      this.logger.error("profile not found")
      throw new NotFoundException('NO profile was found');
    }

    return profile;
  }

 

  // profile.service.ts
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    files?: {
      photo?: Express.Multer.File[];
      portfolioImages?: Express.Multer.File[];
    },
  ) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Upload new profile photo if provided
    if (files?.photo?.[0]) {
      // Delete old photo from cloudinary
      if (profile.photoPublicId) {
        await this.cloudinaryService.deleteImage(profile.photoPublicId);
      }

      const uploaded = await this.cloudinaryService.uploadImage(
        files.photo[0],
        'profile',
      );
      updateProfileDto['photoUrl'] = uploaded.url;
      updateProfileDto['photoPublicId'] = uploaded.publicId;
    }

    // Handle portfolio updates
    if (updateProfileDto.portfolio || files?.portfolioImages) {
      const existingPortfolio = profile.portfolio || [];
      const newPortfolio = updateProfileDto.portfolio || [];

      // Merge: keep existing items, add new ones with images
      const portfolio = await this.updatePortfolio(
        existingPortfolio,
        newPortfolio,
        files?.portfolioImages || [],
      );
      updateProfileDto['portfolio'] = portfolio;
    }

    // Validate and update services/categories
    if (updateProfileDto.services) {
      const result = await this.validateAndExtractCategories(
        updateProfileDto.services,
      );

      // Calculate difference to update popularity
      const oldServices = profile.services!.map((s) => s.toString());
      const newServices = result.serviceIds;

      // Decrement removed services
      const removed = oldServices.filter((s) => !newServices.includes(s));
      if (removed.length > 0) {
        await this.decrementServicePopularity(removed);
      }

      // Increment added services
      const added = newServices.filter((s) => !oldServices.includes(s));
      if (added.length > 0) {
        await this.incrementServicePopularity(added);
      }

      updateProfileDto['services'] = result.serviceIds;
      updateProfileDto['categories'] = result.categories;
    }

    // Location
    if (updateProfileDto.location) {
      updateProfileDto['location'] = this.buildLocationData(updateProfileDto.location);
    }

    // Update profile
    const updatedProfile = await this.profileModel
      .findOneAndUpdate({ userId }, { $set: updateProfileDto }, { new: true })
      .populate('services', 'name category slug');

    return updatedProfile;
  }

  /**
   * Update portfolio - merge existing with new items
   */
  private async updatePortfolio(
    existingPortfolio: any[],
    newPortfolio: PortfolioItemDto[],
    files: Express.Multer.File[],
  ): Promise<any[]> {
    // Upload new images
    const portfolioWithImages = await this.processPortfolio(
      newPortfolio,
      files,
    );

    // Strategy: Replace entire portfolio or merge?
    // Option 1: Replace entirely (simpler)
    return portfolioWithImages;

    // Option 2: Merge (if you want to preserve old items)
    // return [...existingPortfolio, ...portfolioWithImages];
  }

  /**
   * Decrement popularity for removed services
   */
  private async decrementServicePopularity(
    serviceIds: string[],
  ): Promise<void> {
    const decrementPromises = serviceIds.map((serviceId) =>
      this.servicesService.decrementPopularity(serviceId),
    );
    await Promise.all(decrementPromises);
  }

  /**
   * Update profile picture
   */

  async updateProfilePhoto(userId: string, file: Express.Multer.File) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete old photo
    if (profile.photoPublicId) {
      await this.cloudinaryService.deleteImage(profile.photoPublicId);
    }

    // Upload new photo
    const uploaded = await this.cloudinaryService.uploadImage(file, 'profile');

    profile.photoUrl = uploaded.url;
    profile.photoPublicId = uploaded.publicId;
    await profile.save();

    return { photoUrl: profile.photoUrl, photoPublicId: profile.photoPublicId };
  }

  async deleteProfilePhoto(userId: string) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.photoPublicId) {
      await this.cloudinaryService.deleteImage(profile.photoPublicId);
    }

    profile.photoUrl = undefined;
    profile.photoPublicId = undefined;
    await profile.save();

    return { message: 'Profile photo deleted' };
  }

  /**
   * get profile by userId
   */
  async getProfileByUserId(userId: string) {
    const isValidId = Types.ObjectId.isValid(userId);
    if (!isValidId) throw new BadRequestException('invalid ID');

    const profile = await this.profileModel
      .findOne({ userId })
      .populate('userId', 'name email')
      .populate('services', 'name category slug')
      .select('-photoPublicId -verificationType -__v -updatedAt');

    if (!profile) {
      this.logger.log('no profile found');
      throw new NotFoundException('No profile found');
    }

    return profile;
  }

  /**
   * Used by NotificationsService trigger in JobsService:
   * returns the userId of providers who list this service in their profile.
   * Capped at 50 to avoid flooding.
   */
  async findProvidersByService(serviceId: string): Promise<string[]> {
    const profiles = await this.profileModel
      .find({ services: serviceId })
      .select('userId')
      .limit(50)
      .lean();
    return profiles.map((p) => p.userId.toString());
  }

  /**
   * Called by ReviewsService after recalculating ratings from the Review collection.
   */
  async updateProviderRating(
    userId: string,
    ratingAvg: number,
    ratingCount: number,
  ): Promise<void> {
    await this.profileModel.findOneAndUpdate({ userId }, { ratingAvg, ratingCount });
  }

  private buildLocationData(locationDto: LocationDto) {
    const { lat, lng, street, city, state, country } = locationDto;

    if ((lat !== undefined && lng === undefined) || (lng !== undefined && lat === undefined)) {
      throw new BadRequestException('Both lat and lng must be provided together');
    }

    return {
      ...(street && { street }),
      ...(city && { city }),
      ...(state && { state }),
      ...(country && { country }),
      ...(lat !== undefined && lng !== undefined && {
        coordinates: {
          type: 'Point' as const,
          coordinates: [lng, lat] as [number, number],
        },
      }),
    };
  }

  async queryProfiles(queryDto: QueryProfilesDto) {
    const {
      category,
      serviceId,
      city,
      skill,
      minRate,
      maxRate,
      minRating,
      verified,
      lat,
      lng,
      radius = 50,
    } = queryDto;

    const query: any = {};

    if (category) query.categories = category;
    if (serviceId) query.services = serviceId;
    if (skill) query.skills = { $in: [new RegExp(skill, 'i')] };
    if (verified !== undefined) query.verified = verified;

    if (minRate || maxRate) {
      query.rate = {};
      if (minRate) query.rate.$gte = minRate;
      if (maxRate) query.rate.$lte = maxRate;
    }

    if (minRating) query.ratingAvg = { $gte: minRating };

    // Geo search — use aggregation to get distance back
    if (lat !== undefined && lng !== undefined) {
      return this.profileModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: radius * 1000,
            spherical: true,
            query,
          },
        },
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
          },
        },
        {
          $lookup: {
            from: 'services',
            localField: 'services',
            foreignField: '_id',
            as: 'services',
            pipeline: [{ $project: { name: 1, category: 1, slug: 1 } }],
          },
        },
        {
          $project: {
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
            distanceMeters: 0,
          },
        },
      ]);
    }

    // City text search fallback
    if (city) query['location.city'] = new RegExp(city, 'i');

    return this.profileModel
      .find(query)
      .populate('services', 'name category slug')
      .sort({ ratingAvg: -1, ratingCount: -1 })
      .select('-__v -createdAt -updatedAt');
  }

}
