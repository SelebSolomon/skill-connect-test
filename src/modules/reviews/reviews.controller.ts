import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * Client submits a review for the provider of a completed job.
   */
  @Post()
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Client]])
  postReview(
    @Body() dto: CreateReviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.reviewsService.postReview(dto, req.user.sub);
  }

  /**
   * GET /reviews/user/:userId
   * Public — get all reviews written about a given provider.
   */
  @Get('user/:userId')
  getReviewsByUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsByUser(userId);
  }

  /**
   * PATCH /reviews/:id
   * Admin only — correct a review's rating or comment.
   */
  @Patch(':id')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  updateReview(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.updateReview(id, dto);
  }

  /**
   * DELETE /reviews/:id
   * Admin only — soft-deletes a review and recalculates the provider's rating.
   */
  @Delete(':id')
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Admin]])
  deleteReview(@Param('id') id: string) {
    return this.reviewsService.deleteReview(id);
  }
}
