import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from 'src/shared/role/schema/schema';
import { RoleName } from 'src/common/enums/roles-enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId;

  @Prop({ type: String, enum: RoleName, required: true })
  roleName: RoleName;

  @Prop({ type: Types.ObjectId, ref: 'Profile' })
  profile: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  banned: boolean;

  // Password management
  @Prop({ select: false })
  passwordChangedAt?: Date;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;

  // Email verification
  @Prop({ select: false })
  emailVerificationToken?: string;

  @Prop({ select: false })
  emailVerificationTokenExpires?: Date;

  @Prop({ default: false })
  emailVerified: boolean;

  // Refresh token
  @Prop({ select: false })
  refreshToken?: string;

  // Wallet balance (for commission system)
  @Prop({ default: 0 })
  walletBalance?: number;

  @Prop({ default: 0 })
  commissionOwed?: number;

  @Prop({ default: false })
  profileCompleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ verified: 1 });

// Password changed hook
UserSchema.pre('save', function () {
  if (!this.isModified('password')) return;

  this.passwordChangedAt = new Date(Date.now() - 1000);
});

// Method to check if password changed after token issued
// UserSchema.methods.changedPasswordAfter = function (JWTTimestamp: number) {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = parseInt(
//       (this.passwordChangedAt.getTime() / 1000).toString(),
//       10,
//     );
//     return JWTTimestamp < changedTimestamp;
//   }
//   return false;
// };

// Method to check if password changed after token issued
UserSchema.methods.changedPasswordAfter = function (
  this: UserDocument,
  JWTTimestamp: number,
): boolean {
  if (!this.passwordChangedAt) return false;

  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);

  return JWTTimestamp < changedTimestamp;
};

UserSchema.set('toJSON', {
  transform: function (_doc, ret) {
    const obj = ret as unknown as Record<string, any>;

    delete obj.password;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.refreshToken;
    delete obj.__v;

    return obj;
  },
});
