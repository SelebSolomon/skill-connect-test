import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { RoleService } from 'src/shared/role/role.service';
import { RoleDocument } from 'src/shared/role/schema/schema';
import { RoleName } from 'src/common/enums/roles-enums';
import * as crypto from 'crypto';
import { generateVerificationToken } from 'src/common/utils/generate-verification-token';
import {
  sendPasswordResetEmailHelper,
  sendVerificationEmailAsync,
  sendWelcomeEmailHelper,
} from 'src/common/utils/send-emails';
import { EmailService } from 'src/shared/email/email.service';
import { LoginDto } from './dto/login.dto';
import { signAccessToken, signRefreshToken } from 'src/common/utils/jwt-token';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/common/interface/jwt-payload';
import { UpdatePasswordDto } from './dto/update-password-dto';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    private userService: UsersService,
    private roleService: RoleService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.findUserByEmailOrPhone(
      createUserDto.email,
      createUserDto.phone,
    );

    if (user) {
      throw new ConflictException('User already exist');
    }

    // Step 2: Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Step 3: Resolve role from the chosen roleName (client | provider)
    const role: RoleDocument = await this.roleService.findByNameOrFail(
      createUserDto.roleName,
    );

    const verificationToken = generateVerificationToken();

    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const newUser = await this.userService.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      role: role._id,
      roleName: role.name,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: expires,
      emailVerified: false,
      isActive: true,
      phone: createUserDto.phone,
    });

    await sendVerificationEmailAsync(
      this.emailService,
      this.logger,
      newUser.email,
      verificationToken,
      newUser.name,
    );

    const response = {
      status: 'success',
      message:
        'User registered successfully. Please check your email to verify your account.',
      data: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.roleName,
        phone: newUser.phone,
      },
    };

    return response;
  }
  async verifyEmail(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user =
      await this.userService.findByEmailVerificationToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return {
        status: 'success',
        message: 'Email already verified',
      };
    }

    if (user.emailVerificationTokenExpires! < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.userService.update(user._id.toString(), {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationTokenExpires: undefined,
    });

    await sendWelcomeEmailHelper(
      this.emailService,
      this.logger,
      user.email,
      user.name,
    );

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async resendVerificationEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Bad request');
    }
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new ConflictException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Generate new token
    const verificationToken = generateVerificationToken();
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Update user with new token
    await this.userService.update(user._id.toString(), {
      emailVerificationToken: hashedToken,
    });

    // Send email
    const result = await this.emailService.sendVerificationEmail(
      'skill link',
      user.email,
      verificationToken,
      user.name,
    );

    if (!result.success) {
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, phone, password } = loginDto;
    const existingUser = await this.userService.findUserByEmailOrPhone(
      email!,
      phone!,
    );

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      throw new NotFoundException('Invalid Credentials');
    }

    if (!existingUser.isActive || !existingUser.emailVerified) {
      throw new BadRequestException('An Error occured, Please verify your email or contact support');
    }

    // Inside your login method

    // 1️⃣ Sign access token
    const accessToken = await signAccessToken(
      this.jwtService,
      existingUser._id.toString(),
      existingUser.role.toString(),
      existingUser.email,
    );

    // 2️⃣ Sign refresh token (separate secret)
    const refreshToken = await signRefreshToken(
      this.jwtService,
      existingUser._id.toString(),
      this.configService,
    );

    // 3️⃣ Hash refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    // 4️⃣ Save hashed refresh token in DB (rotation)
    await this.userService.update(existingUser._id.toString(), {
      refreshToken: hashedRefreshToken,
    });

    // 5️⃣ Return tokens
    return {
      success: true,
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    // 1️⃣ Verify the token (throws if invalid/expired)
    let decoded: { sub: string; type?: string };
    try {
      decoded = this.jwtService.verify<{ sub: string; type?: string }>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET },
      );
    } catch (err) {
      this.logger.error(err.message);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2 Make sure it's actually a refresh token
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Not a refresh token');
    }

    const userId = decoded.sub;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    // 3 Find the user and include hashed refresh token
    const user = await this.userService.findByIdForRefreshToken(userId);
    if (!user || !user.refreshToken)
      throw new UnauthorizedException('Invalid refresh token');

    // 4 Compare token with hashed version in DB
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid)
      throw new UnauthorizedException('Refresh token does not match');

    // 5 Issue new tokens
    const accessToken = await signAccessToken(
      this.jwtService,
      user._id.toString(),
      user.role.toString(),
      user.email,
    );

    const newRefreshToken = await signRefreshToken(
      this.jwtService,
      user._id.toString(),
      this.configService,
    );

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userService.updateRefreshToken(
      user._id.toString(),
      hashedRefreshToken,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(loggedInUser: string) {
    const user = await this.userService.findById(loggedInUser);
    if (!user) {
      throw new UnauthorizedException('You are not loggedIn');
    }
    await this.userService.update(user._id.toString(), { refreshToken: '' });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async updatePassword(updatePasswordDto: UpdatePasswordDto, userId: string) {
    const user = await this.userService.findUserByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const comparePassword = await bcrypt.compare(
      updatePasswordDto.oldPassword,
      user.password,
    );

    if (!comparePassword) {
      throw new UnauthorizedException('Incorrect password Old password');
    }

    user.password = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await user.save();

    return {
      message: 'Successfully updated Password',
    };
  }


    async forgotPassword(email: string) {
    const userEmail = await this.userService.findByEmail(email);

    if (userEmail) {
      const token = generateVerificationToken();
      const expiryDate = new Date();

      expiryDate.setMinutes(expiryDate.getMinutes() + 20);

      await this.userService.createForgotPasswordToken(
        userEmail._id.toString(),
        token,
        expiryDate,
      );

      await sendPasswordResetEmailHelper(
        this.emailService,
        this.logger,
        userEmail.email,
        token,
      );
    }

    return {
      message:
        'If an account exists with this email, a reset link has been sent.',
    };
  }


  async resetPassword(resetToken: string, newPassword: string) {
    const user = await this.userService.findByPasswordResetToken(resetToken);

    if (!user) {
      throw new BadRequestException('Token is invalid or has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    return {
      message: 'Password updated successfully',
    };
  }
}
