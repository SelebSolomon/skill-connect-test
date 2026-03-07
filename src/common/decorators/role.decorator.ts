// role.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Permission, RolePermissions } from '../enums/permissions-enum';
import { RoleName } from '../enums/roles-enums';

export const PERMISSION_KEY = 'permissions';
export const ROLE_KEY = 'roles';

// Use this if you want to restrict by role
export const Roles = (roles: RoleName[]) => SetMetadata(ROLE_KEY, roles);

// Use this if you want to restrict by permission(s)
// Accepts either Permission[] or RoleName[] (auto-expands to permissions)
export const Permissions = (
  permsOrRoles: Permission[] | RoleName[],
): MethodDecorator & ClassDecorator => {
  const permissions: Permission[] = [];

  permsOrRoles.forEach((item: any) => {
    if (typeof item === 'string' && Object.values(Permission).includes(item as Permission)) {
      // Direct permission
      permissions.push(item as Permission);
    } else if (Object.values(RoleName).includes(item as RoleName)) {
      // Expand role to its permissions
      permissions.push(...RolePermissions[item as RoleName]);
    }
  });

  // Remove duplicates
  const uniquePermissions = Array.from(new Set(permissions));

  return SetMetadata(PERMISSION_KEY, uniquePermissions);
};
