import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Permission, RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({
    required: true,
    unique: true,
    enum: RoleName,
    default: RoleName.Guest,
  })
  name: RoleName;

  @Prop({
    type: [String],
    enum: Permission,
    default: () => RolePermissions[RoleName.Guest],
  })
  permissions: Permission[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
