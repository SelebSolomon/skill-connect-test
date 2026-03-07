// permissions.enum.ts

import { RoleName } from './roles-enums';

export enum Permission {
  // Auth
  ManageOwnAccount = 'manage_own_account',

  // Jobs
  CreateJob = 'create_job',
  ManageOwnJobs = 'manage_own_jobs',
  ViewJobs = 'view_jobs',
  AssignProvider = 'assign_provider',

  // Bids
  CreateBid = 'create_bid',
  ManageOwnBids = 'manage_own_bids',
  ViewBids = 'view_bids',
  AcceptBid = 'accept_bid',

  // Profile
  ManageProviderProfile = 'manage_provider_profile',
  ViewProfiles = 'view_profiles',

  // Messaging
  ManageMessages = 'manage_messages',

  // Reviews
  ManageReviews = 'manage_reviews',

  // Transactions
  ViewOwnTransactions = 'view_own_transactions',
  PayCommission = 'pay_commission',

  // Wallet
  ManageWallet = 'manage_wallet',

  // Admin
  ManageUsers = 'manage_users',
  VerifyProviders = 'verify_providers',
  ManageServices = 'manage_services',
  ViewAllData = 'view_all_data',
  ManagePlatform = 'manage_platform',
}

export const RolePermissions: Record<RoleName, Permission[]> = {
  [RoleName.Guest]: [Permission.ViewProfiles, Permission.ViewJobs],

  [RoleName.Client]: [
    Permission.ManageOwnAccount,
    Permission.ViewProfiles,
    Permission.CreateJob,
    Permission.ManageOwnJobs,
    Permission.ViewJobs,
    Permission.ViewBids,
    Permission.AcceptBid,
    Permission.AssignProvider,
    Permission.ManageMessages,
    Permission.ManageReviews,
    Permission.ViewOwnTransactions,
  ],

  [RoleName.Provider]: [
    Permission.ManageOwnAccount,
    Permission.ManageProviderProfile,
    Permission.ViewProfiles,
    Permission.ViewJobs,
    Permission.CreateBid,
    Permission.ManageOwnBids,
    Permission.ManageMessages,
    Permission.ManageReviews,
    Permission.ViewOwnTransactions,
    Permission.PayCommission,
    Permission.ManageWallet,
  ],

  [RoleName.Admin]: [
    Permission.ManageOwnAccount,
    Permission.ManageUsers,
    Permission.VerifyProviders,
    Permission.ManageServices,
    Permission.ViewAllData,
    Permission.ManagePlatform,
    Permission.ViewProfiles,
    Permission.ViewJobs,
    Permission.ViewBids,
    Permission.ManageMessages,
    Permission.ManageReviews,
  ],
};
