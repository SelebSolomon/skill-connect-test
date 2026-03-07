// // src/roles/dto/create-role.dto.ts
// import { IsEnum, IsOptional, IsArray, ArrayUnique } from 'class-validator';
// import { RoleName } from '../enums/roles-enums';
// import { Permission } from '../enums/permissions-enums';

// export class CreateRoleDto {
//   @IsEnum(RoleName, { message: 'Invalid role name' })
//   name: RoleName;

//   @IsArray()
//   @ArrayUnique()
//   @IsEnum(Permission, { each: true, message: 'Invalid permission value' })
//   @IsOptional()
//   permissions?: Permission[];
// }
