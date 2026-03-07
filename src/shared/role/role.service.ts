import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './schema/schema';
import { Model } from 'mongoose';
import { RoleName } from 'src/common/enums/roles-enums';
import { Permission, RolePermissions } from 'src/common/enums/permissions-enum';

@Injectable()
export class RoleService {
  private readonly logger: Logger = new Logger(RoleService.name);

  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async safeFindByName(roleName: RoleName): Promise<RoleDocument | null> {
    const role = await this.roleModel.findOne({ name: roleName }).exec();
    return role || null;
  }

  async getAdminRole() {
    const role = await this.roleModel.findOne({ name: RoleName.Admin });
    if (!role) {
      throw new Error('Admin role not found. Roles must be seeded first.');
    }
    return role;
  }

  private async createAdminRole(): Promise<RoleDocument> {
    const adminRole = new this.roleModel({
      name: RoleName.Admin,
      permissions: RolePermissions[RoleName.Admin],
    });

    return await adminRole.save();
  }

  // Find role by name
  async findByNameOrFail(roleName: RoleName): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ name: roleName }).exec();

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' does not exist`);
    }

    return role;
  }

  async findByIdOrFail(roleId: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(roleId).exec();

    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    return role;
  }

  // Get default role for new users (Client)
  async getDefaultClientRole(): Promise<RoleDocument> {
    try {
      return await this.findByNameOrFail(RoleName.Client);
    } catch (error) {
      return await this.createRole(
        RoleName.Client,
        RolePermissions[RoleName.Client],
      );
    }
  }

  // Get provider role
  async getProviderRole(): Promise<RoleDocument> {
    try {
      return await this.findByNameOrFail(RoleName.Provider);
    } catch (error) {
      return await this.createRole(
        RoleName.Provider,
        RolePermissions[RoleName.Provider],
      );
    }
  }

  // Create role with permissions from enum
  private async createRole(
    roleName: RoleName,
    permissions: Permission[],
  ): Promise<RoleDocument> {
    const role = new this.roleModel({ name: roleName, permissions });
    return await role.save();
  }

  // Check if role has permission
  hasPermission(role: RoleDocument, permission: Permission): boolean {
    return role.permissions.includes(permission);
  }
}
