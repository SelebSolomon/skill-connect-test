// services.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from './schema/service.schema';
import { INITIAL_SERVICES } from './seeding/seed.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  // functions to use external
  async getServiceById(id: string) {
    return this.serviceModel.findOne({ _id: id, isActive: true });
  }

  // Seed initial services (run once)
  // services.service.ts
  async seedServices() {
    const count = await this.serviceModel.countDocuments();
    if (count > 0) {
      return { message: 'Services already seeded' };
    }

    // Generate slugs manually before inserting
    const servicesWithSlugs = INITIAL_SERVICES.map((service) => ({
      ...service,
      slug: service.name.toLowerCase().replace(/\s+/g, '-'),
    }));

    await this.serviceModel.insertMany(servicesWithSlugs);
    return {
      message: `${INITIAL_SERVICES.length} services seeded successfully`,
    };
  }

  // services.service.ts - Add decrement method
  async decrementPopularity(serviceId: string) {
    await this.serviceModel.findByIdAndUpdate(serviceId, {
      $inc: { popularityCount: -1 },
    });
  }
  async validateServiceIds(serviceIds: string[]) {
    const services = await this.serviceModel
      .find({
        _id: { $in: serviceIds },
        isActive: true,
      })
      .select('_id name category');

    return services;
  }

  async incrementPopularity(serviceId: string) {
    await this.serviceModel.findByIdAndUpdate(serviceId, {
      $inc: { popularityCount: 1 },
    });
  }

  // Public: Get all active services
  async findAll(category?: string, search?: string) {
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    return this.serviceModel
      .find(query)
      .sort({ popularityCount: -1, name: 1 })
      .select('-__v');
  }

  // Public: Get service by slug
  async findBySlug(slug: string) {
    const service = await this.serviceModel.findOne({ slug, isActive: true });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  // Public: Get all categories
  async getCategories() {
    return this.serviceModel.distinct('category');
  }

  // Admin: Create new service
  async create(createServiceDto: CreateServiceDto) {
    const exists = await this.serviceModel.findOne({
      name: createServiceDto.name,
    });

    if (exists) {
      throw new BadRequestException('Service already exists');
    }

    const service = await this.serviceModel.create(createServiceDto);
    return service;
  }

  // Admin: Update service
  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const validId = Types.ObjectId.isValid(id);
    if (!validId) {
      throw new BadRequestException('Invalid service ID');
    }

    const service = await this.serviceModel.findByIdAndUpdate(
      id,
      updateServiceDto,
      { new: true },
    );

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  // Admin: Delete service (soft delete)
  async delete(id: string) {
    const validId = Types.ObjectId.isValid(id);
    if (!validId) {
      throw new BadRequestException('Invalid service ID');
    }

    const service = await this.serviceModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return { message: 'Service deleted successfully' };
  }

  // Admin: Get all services (including inactive)
  async findAllAdmin() {
    return this.serviceModel
      .find()
      .sort({ category: 1, name: 1 })
      .select('-__v');
  }
}
