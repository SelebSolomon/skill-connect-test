import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dto/register.dto';
import { CreateUserInput } from './types/create-user-types';
import { UpdateMeDto } from './dto/update-me.dto';
import { RoleService } from 'src/shared/role/role.service';
import { RoleName } from 'src/common/enums/roles-enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private roleService: RoleService,
  ) {}
  async findUserByEmailOrPhone(email: string, phone: string) {
    return this.userModel
      .findOne({
        $or: [{ email }, { phone }],
      })
      .select('+password');
  }

  async findByRole(roleName: RoleName): Promise<UserDocument[]> {
    const role = await this.roleService.safeFindByName(roleName);
    if (!role) {
      return [];
    }

    // 2️⃣ Find users with that role and active status
    return await this.userModel.find({ role: role._id, isActive: true }).exec();
  }

  // create admin
  async createAdmin(createAdminDto: any) {
    return await this.userModel.create(createAdminDto);
  }

  async findOneById(userId: string) {
    return await this.userModel.findOne({ _id: userId }).select('name email')
  }

  async findUserByIdWithPassword(userId: string) {
    return await this.userModel.findById(userId).select('+password');
  }

  async create(createUsertype: CreateUserInput) {
    return await this.userModel.create(createUsertype);
  }

  async findByEmailVerificationToken(token: string) {
    return this.userModel.findOne({ emailVerificationToken: token }).exec();
  }

  async update(
    userId: string,
    updateData: Partial<User>,
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async findById(userId: string) {
    return await this.userModel.findById(userId);
  }

  async findByIdForRefreshToken(id: string) {
    return this.userModel.findOne({ _id: id }).select('+refreshToken').exec();
  }
  async updateRefreshToken(userId: string, hashedToken: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { refreshToken: hashedToken },
      { new: true },
    );
  }

  async createForgotPasswordToken(
    userId: string,
    token: string,
    expiryDate: Date,
  ) {
    return await this.userModel.findOneAndUpdate(
      { _id: userId },
      {
        passwordResetToken: token,
        passwordResetExpires: expiryDate,
      },
      { new: true },
    );
  }

  async findByPasswordResetToken(token: string) {
    return await this.userModel.findOne({
      passwordResetExpires: { $gte: new Date() },
      passwordResetToken: token,
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      },
      { new: true },
    );
  }

  async getUserRoles(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new BadRequestException();

    const role = await this.roleService.findByIdOrFail(user.role.toString());
    return role?.name;
  }

  async getUserPermissions(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new BadRequestException();

    const role = await this.roleService.findByIdOrFail(user.role.toString());
    return role?.permissions;
  }

  async me(loggedinUser: string) {
    const user = await this.userModel.findById(loggedinUser);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const response = {
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    return {
      status: 'success',
      data: {
        user,
      },
    };
  }

  async updateMe(updateMeDto: UpdateMeDto, loggedinUser: string) {
    const { email, name, phone } = updateMeDto;

    const user = await this.userModel.findOne({
      _id: loggedinUser,
      isActive: true,
      banned: false,
    });

    if (!user) {
      throw new UnauthorizedException(
        'You are not allowed to perform this action',
      );
    }

    const updatedInfo = await this.userModel.findByIdAndUpdate(
      loggedinUser,
      { email, name, phone },
      { new: true, runValidators: true },
    );

    return {
      status: 'success',

      data: {
        updatedInfo,
      },
    };
  }

  async deleteMe(userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      isActive: true,
      banned: false,
    });

    if (!user) {
      throw new UnauthorizedException('You cant perform this acction');
    }

    user.isActive = false;
    await user.save();

    return {
      status: 'success',
      message: 'Account deleted successfully',
    };
  }
}
