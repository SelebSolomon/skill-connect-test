// roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from 'src/common/decorators/role.decorator';
import { Permission, RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';

import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId: string = user.sub;

    // Get the user's role (assumes single role)
    const userRole: RoleName = await this.usersService.getUserRoles(userId);
    const userPermissions: Permission[] = RolePermissions[userRole] || [];

    // Get required permissions from the decorator
    const requiredPermissionsRaw =
      this.reflector.getAllAndOverride(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // Ensure all required permissions are valid Permission enum values
    const requiredPermissions: Permission[] = requiredPermissionsRaw.filter(
      (p: any): p is Permission =>
        Object.values(Permission).includes(p as Permission),
    );

    // Check that the user has all required permissions
    const hasAllPermissions = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
// roles.guard.ts - Don't query database
// export class RolesGuard implements CanActivate {
//   constructor(private readonly reflector: Reflector) {}
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     if (!user?.sub) {
//       throw new UnauthorizedException('User not authenticated');
//     }

// Get role from JWT payload (already validated)
//     const userRole: RoleName = user.role; // Don't call getUserRoles
//     const userPermissions: Permission[] = RolePermissions[userRole] || [];

//     // Rest of your code...
//     const requiredPermissionsRaw =
//       this.reflector.getAllAndOverride(PERMISSION_KEY, [
//         context.getHandler(),
//         context.getClass(),
//       ]) || [];

//     const requiredPermissions: Permission[] = requiredPermissionsRaw.filter(
//       (p: any): p is Permission =>
//         Object.values(Permission).includes(p as Permission),
//     );

//     const hasAllPermissions = requiredPermissions.every((p) =>
//       userPermissions.includes(p),
//     );

//     if (!hasAllPermissions) {
//       throw new ForbiddenException('Insufficient permissions');
//     }

//     return true;
//   }
// }
