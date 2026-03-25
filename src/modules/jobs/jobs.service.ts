import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Job, JobDocument } from './schema/job.schema';
import { Connection, Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import { ServicesService } from '../services/services.service';
import { buildQuery } from '../../common/utils/query-builder';
import { JobQueryDto } from './dto/query.dto';
import { QueryBuilder } from 'src/common/utils/query-builder/query-builder';
import { Status } from './enums/status.enum';
import { MilestoneStatus } from './enums/milestone-status.enum';
import { UsersService } from '../users/users.service';
import { RoleName } from 'src/common/enums/roles-enums';
import { AssignProviderDto } from './dto/assign-provider-id.dto';
import { BidsService } from '../bids/bids.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';
import { ProfileService } from '../profile/profile.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class JobsService {
  private logger = new Logger(JobsService.name);
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectConnection() private readonly connection: Connection,
    private cloudinaryService: CloudinaryService,
    private serviceService: ServicesService,
    private userService: UsersService,
    @Inject(forwardRef(() => BidsService))
    private bidsService: BidsService,
    private notificationsService: NotificationsService,
    private profileService: ProfileService,
    private transactionsService: TransactionsService,
  ) {}

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const job = await this.jobModel
      .findById(id)
      .select(' -createdAt -updatedAt -__v');

    if (!job) {
      throw new NotFoundException('NO job found with this id');
    }

    if (job?.isDeleted) {
      throw new NotFoundException('this job was deleted');
    }

    return job;
  }

  async createJob(
    createJobDto: CreateJobDto,
    loggedInClientId: string,
    file: Express.Multer.File,
  ) {
    if (!loggedInClientId) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action',
      );
    }
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'jobs',
      );
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.publicId;
    }

    const service = await this.serviceService.getServiceById(
      createJobDto.serviceId,
    );

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    let parsedMilestones: { title: string; description?: string; amount?: number }[] = [];
    if (createJobDto.milestones) {
      try {
        parsedMilestones = JSON.parse(createJobDto.milestones);
      } catch {
        parsedMilestones = [];
      }
    }

    const job = await this.jobModel.create({
      clientId: loggedInClientId,
      title: createJobDto.title,
      description: createJobDto.description,
      budget: createJobDto.budget,
      jobLocation: createJobDto.jobLocation,
      serviceId: createJobDto.serviceId,
      imageUrl,
      imagePublicId,
      milestones: parsedMilestones,
    });

    // Notify providers who match by service, category, or nearby city (fire-and-forget)
    const city = createJobDto.jobLocation?.split(',')[0]?.trim();
    this.profileService
      .findProvidersByService(createJobDto.serviceId, {
        category: service.category,
        city,
      })
      .then((providerIds) => {
        const targets = providerIds.filter((id) => id !== loggedInClientId);
        return this.notificationsService.sendToMany(targets, {
          type: NotificationType.Job,
          title: 'New Job Posted',
          message: `A new job matching your services: "${createJobDto.title}"`,
          link: `/jobs/${job._id}`,
        });
      })
      .catch(() => null);

    return job;
  }

  async getJobs(query: JobQueryDto) {
    return buildQuery(
      this.jobModel,
      query,
      {
        textFields: ['title', 'description'],
        locationField: 'jobLocation',
        objectIdFields: ['serviceId', 'providerId', 'clientId'],
        enumFields: ['status'],
      },
      {
        excludeFields: [
          'milestones',
          'imagePublicId',
          'isDeleted',
          'deletedBy',
          'deleteAt',
          'createdAt',
          'updatedAt',
        ],
      },
    ).exec({ isDeleted: false });
  }

  async myJobs(loggedInUser: string, query: JobQueryDto) {
    const userFilter = {
      isDeleted: false,
      $or: [{ clientId: loggedInUser }, { providerId: loggedInUser }],
    };

    return new QueryBuilder(this.jobModel, query, {
      textFields: ['title', 'description'],
      locationField: 'jobLocation',
      enumFields: ['status'],
    })
      .filter()
      .search()
      .location()
      .sort()
      .fields()
      .paginate()
      .exec(userFilter);
  }

  async getJobById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const job = await this.jobModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!job) {
      throw new NotFoundException('NO jobs found with this id');
    }

    return job;
  }

  async updateJob(
    id: string,
    updateJobDto: UpdateJobDto,
    loggedInUser: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const allowedFields = ['title', 'description', 'budget', 'jobLocation'];
    const sentFields = Object.keys(updateJobDto);

    const invalidFields = sentFields.filter((f) => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Cannot update fields: ${invalidFields.join(', ')}`,
      );
    }

    const updateData: Partial<UpdateJobDto> = {};
    for (const field of allowedFields) {
      if (updateJobDto[field] !== undefined) {
        updateData[field] = updateJobDto[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const job = await this.jobModel.findOneAndUpdate(
      {
        _id: id,
        clientId: loggedInUser,
        status: Status.open,
        isDeleted: false,
      },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!job) {
      throw new NotFoundException('Job not found or cannot be updated');
    }

    return job;
  }

  async deleteJob(id: string, loggedInUser: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const job = await this.jobModel.findById(id);

    if (!job) {
      throw new NotFoundException('NO job found with this id');
    }

    if (job.clientId.toString() !== loggedInUser) {
      throw new UnauthorizedException(
        'You are not authorized to delete this job',
      );
    }

    if (job.status !== Status.open) {
      throw new BadRequestException(
        'Only jobs with status "open" can be deleted',
      );
    }

    await this.jobModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedBy: loggedInUser,
          deleteAt: new Date(),
        },
      },
      { new: true },
    );

    // Remove all bids for this job so providers are not blocked from bidding elsewhere
    await this.bidsService.deleteByJob(id);

    return { message: 'Job deleted successfully' };
  }

  async assignProvider(
    id: string,
    loggedInUser: string,
    assignProviderDto: AssignProviderDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }
    const { providerId } = assignProviderDto;

    const provider = await this.userService.findById(providerId);
    if (!provider || provider.roleName !== RoleName.Provider) {
      throw new BadRequestException('Invalid provider');
    }

    const bid = await this.bidsService.findByProviderAndJob(providerId, id);
    const agreedPrice = bid?.proposedPrice ?? null;

    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: id,
          clientId: loggedInUser,
          status: Status.open,
          providerId: null,
        },
        {
          $set: {
            providerId: new Types.ObjectId(providerId),
            status: Status.in_progress,
            assignedDate: new Date(),
            ...(agreedPrice !== null && { agreedPrice }),
          },
        },
        { new: true },
      )
      .select(
        '-milestones -imagePublicId -isDeleted -deletedBy -deleteAt -createdAt -updatedAt',
      );

    if (!job) {
      throw new BadRequestException('Job already assigned or not found');
    }

    // Update bid statuses — mark winner as accepted, reject the rest
    await this.bidsService.markBidAccepted(providerId, id);
    await this.bidsService.rejectOtherBids(id, providerId);

    this.notificationsService
      .send({
        userId: providerId,
        type: NotificationType.Job,
        title: 'You Were Assigned to a Job',
        message: `You have been assigned to: "${job.title}"${agreedPrice ? ` for ₦${agreedPrice.toLocaleString()}` : ''}`,
        link: `/jobs/${job._id}`,
      })
      .catch(() => null);

    return job;
  }

  async unassignProvider(id: string, loggedInUser: string, reason: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const job = await this.jobModel.findOne({
      _id: id,
      clientId: loggedInUser,
      providerId: { $exists: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const hoursSinceAssigned =
      (Date.now() - job.assignedDate.getTime()) / (1000 * 60 * 60);

    if (job.status === Status.in_progress && hoursSinceAssigned > 1) {
      throw new BadRequestException(
        'Cannot unassign provider after work has started. Please cancel the job instead.',
      );
    }

    if (job.status === Status.completed) {
      throw new BadRequestException('Cannot unassign completed job');
    }

    const updatedJob = await this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $unset: { providerId: '', assignedDate: '' },
          $set: {
            status: Status.open,
            unassignReason: reason,
            unassignedAt: new Date(),
          },
        },
        { new: true },
      )
      .select(
        '-milestones -imagePublicId -isDeleted -deletedBy -deleteAt -createdAt -updatedAt -unassignedAt -assignedDate ',
      );

    this.notificationsService
      .send({
        userId: job.providerId.toString(),
        type: NotificationType.Job,
        title: 'You Were Unassigned from a Job',
        message: `You have been removed from: "${job.title}". Reason: ${reason}`,
        link: `/jobs/${job._id}`,
      })
      .catch(() => null);

    return updatedJob;
  }

  async completeJob(id: string, loggedInUser: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    // ── Atomic: job status + commission in a single MongoDB session ──────────
    const session = await this.connection.startSession();
    let job: JobDocument | null = null;

    try {
      session.startTransaction();

      job = await this.jobModel.findOneAndUpdate(
        { _id: id, clientId: loggedInUser, status: Status.in_progress },
        { $set: { status: Status.completed } },
        { new: true, session },
      );

      if (!job) {
        await session.abortTransaction();
        throw new NotFoundException(
          'Job not found, not yours, or not in progress',
        );
      }

      await this.transactionsService.recordCommission(
        {
          jobId: id, // 'id' is the validated param — same value, avoids _id type issue
          providerId: job.providerId.toString(),
          clientId: job.clientId.toString(),
          agreedPrice: job.agreedPrice ?? job.budget ?? 0,
        },
        session,
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }

    // Notify AFTER successful commit (fire-and-forget)
    // job! — non-null asserted: if we reach here, the try block succeeded
    this.notificationsService
      .send({
        userId: job!.providerId.toString(),
        type: NotificationType.Job,
        title: 'Job Completed',
        message: `"${job!.title}" has been marked as completed by the client.`,
        link: `/jobs/${id}`,
      })
      .catch(() => null);

    return job!;
  }

  async updateMilestoneStatus(
    jobId: string,
    milestoneId: string,
    status: MilestoneStatus,
    userId: string,
    roleName: string,
  ) {
    if (!Types.ObjectId.isValid(jobId) || !Types.ObjectId.isValid(milestoneId)) {
      throw new BadRequestException('Invalid ID');
    }

    const job = await this.jobModel.findOne({ _id: jobId, isDeleted: false });
    if (!job) throw new NotFoundException('Job not found');

    const milestone = job.milestones.find(
      (m) => m._id.toString() === milestoneId,
    );
    if (!milestone) throw new NotFoundException('Milestone not found');

    if (status === MilestoneStatus.completed) {
      if (roleName !== RoleName.Provider || job.providerId?.toString() !== userId) {
        throw new ForbiddenException('Only the assigned provider can mark milestones as completed');
      }
      if (milestone.status !== MilestoneStatus.pending) {
        throw new BadRequestException('Milestone must be pending to mark as completed');
      }
    }

    if (status === MilestoneStatus.paid) {
      if (job.clientId.toString() !== userId) {
        throw new ForbiddenException('Only the client can release payment for milestones');
      }
      if (milestone.status !== MilestoneStatus.completed) {
        throw new BadRequestException('Milestone must be completed before payment can be released');
      }
    }

    const updated = await this.jobModel.findOneAndUpdate(
      { _id: jobId, 'milestones._id': milestoneId },
      { $set: { 'milestones.$.status': status } },
      { new: true },
    );

    return updated;
  }

  async getBidsForJob(jobId: string, loggedInUser: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid MongoDB Id');
    }

    const job = await this.jobModel.findOne({
      _id: jobId,
      isDeleted: false,
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.clientId.toString() !== loggedInUser) {
      throw new ForbiddenException(
        'You are not allowed to view bids for this job',
      );
    }

    return this.bidsService.findBidsForJob(job._id.toString());
  }
}
