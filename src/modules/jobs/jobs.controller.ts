import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtGuards } from 'src/core/guards/jwt-guards';
import { RolesGuard } from 'src/core/guards/role.guards';
import { Permissions } from 'src/common/decorators/role.decorator';
import { RolePermissions } from 'src/common/enums/permissions-enum';
import { RoleName } from 'src/common/enums/roles-enums';
import { multerOptions } from 'src/core/config/multer.config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation } from '@nestjs/swagger';
import { JobQueryDto } from './dto/query.dto';
import { AssignProviderDto } from './dto/assign-provider-id.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([...RolePermissions[RoleName.Client]])
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  createJob(
    @Body() createJobDto: CreateJobDto,
    @Req() req: Request & { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {

    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    return this.jobsService.createJob(createJobDto, req.user.sub, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all jobs with filtering, search, sort & pagination',
  })
  async getJobs(@Query() query: JobQueryDto) {
    return await this.jobsService.getJobs(query);
  }

  @UseGuards(JwtGuards)
  @Get('my-jobs')
  async myJobs(
    @Req() req: Request & { user: { sub: string } },
    @Query() query: JobQueryDto,
  ) {
    return this.jobsService.myJobs(req.user.sub, query);
  }

  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return await this.jobsService.getJobById(id);
  }

  @UseGuards(JwtGuards)
  @Patch(':id')
  updateJob(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(id, updateJobDto, req.user.sub);
  }

  @UseGuards(JwtGuards)
  @Delete(':id')
  deleteJob(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.deleteJob(id, req.user.sub);
  }

  @UseGuards(JwtGuards)
  @Patch(':id/assign-provider')
  async assignProvider(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() providerId: AssignProviderDto,
  ) {
    return await this.jobsService.assignProvider(id, req.user.sub, providerId);
  }

  @UseGuards(JwtGuards)
  @Patch(':id/unassign-provider')
  async unassignProvider(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body('reason') reason: string,
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException(
        'Reason for unassigning provider is required',
      );
    }
    return await this.jobsService.unassignProvider(id, req.user.sub, reason);
  }

  @UseGuards(JwtGuards, RolesGuard)
  @Permissions([
    ...RolePermissions[RoleName.Client], 
  ])
  @Get(':jobId/bids')
  async getBidsForJob(
    @Req() req: Request & { user: { sub: string } },
    @Param('jobId') jobId: string,
  ) {
    return await this.jobsService.getBidsForJob(jobId, req.user.sub);
  }
}
