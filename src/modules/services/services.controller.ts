// services.controller.ts
import { 
  Controller, Get, Post,  Delete, Body, 
  Param, Query, UseGuards, 
  Patch
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { Permission } from 'src/common/enums/permissions-enum';
import { RolesGuard } from 'src/core/guards/role.guards';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string
  ) {
    return this.servicesService.findAll(category, search);

  }

  @Get('categories')
  async getCategories() {
    return this.servicesService.getCategories();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }

  // Admin routes
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([Permission.ManageServices])
  @Post('seed')
  async seedServices() {
    return this.servicesService.seedServices();
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([Permission.ManageServices])
  @Get('admin/all')
  async findAllAdmin() {
    return this.servicesService.findAllAdmin();
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([Permission.ManageServices])
  @Post()
  async create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([  Permission.ManageServices])
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([Permission.ManageServices])
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.servicesService.delete(id);
  }
}