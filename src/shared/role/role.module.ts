import { Logger, Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schema/schema';
import { RoleSeeder } from './role.seeder';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  controllers: [],
  providers: [RoleService, Logger, RoleSeeder],
  exports: [RoleService],
})
export class RoleModule {}
