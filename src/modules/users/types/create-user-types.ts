import { Types } from 'mongoose';
import { RoleName } from 'src/common/enums/roles-enums';

export type CreateUserInput = {
  // Required core fields
  name: string;
  email: string;
  phone: string;
  password: string;

  role?: Types.ObjectId;
  roleName?: RoleName;

  // Status flags
  isActive?: boolean;
  banned?: boolean;
  verified?: boolean;
  emailVerified?: boolean;

  // Media
  avatar?: string;

  // Email verification
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;

  // Password management
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Refresh token
  refreshToken?: string;

  // Provider-only fields
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  portfolio?: string[];

  // Metrics & money
  rating?: number;
  totalJobs?: number;
  walletBalance?: number;
  commissionOwed?: number;
};
