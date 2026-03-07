// src/shared/role/role.seeder.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schema/schema';
import { RoleName } from 'src/common/enums/roles-enums';
import { RolePermissions } from 'src/common/enums/permissions-enum';

@Injectable()
export class RoleSeeder implements OnModuleInit {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const roles = [
      { name: RoleName.Guest, permissions: RolePermissions[RoleName.Guest] },
      { name: RoleName.Client, permissions: RolePermissions[RoleName.Client] },
      {
        name: RoleName.Provider,
        permissions: RolePermissions[RoleName.Provider],
      },
      { name: RoleName.Admin, permissions: RolePermissions[RoleName.Admin] },
    ];

    for (const role of roles) {
      await this.roleModel.updateOne(
        { name: role.name },
        { $setOnInsert: role },
        { upsert: true },
      );
    }

    console.log('✅ Roles seeded');
  }
}
