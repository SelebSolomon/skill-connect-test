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
import { Job, JobDocument } from './schema/job.schema';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import { ServicesService } from '../services/services.service';
import { buildQuery } from '../../common/utils/query-builder';
import { JobQueryDto } from './dto/query.dto';
import { QueryBuilder } from 'src/common/utils/query-builder/query-builder';
import { Status } from './enums/status.enum';
import { UsersService } from '../users/users.service';
import { RoleName } from 'src/common/enums/roles-enums';
import { AssignProviderDto } from './dto/assign-provider-id.dto';
import { BidsService } from '../bids/bids.service';

@Injectable()
export class JobsService {
  private logger = new Logger(JobsService.name);
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private cloudinaryService: CloudinaryService,
    private serviceService: ServicesService,
    private userService: UsersService,
    @Inject(forwardRef(() => BidsService))
    private bidsService: BidsService,
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
        'You are not authorized to perform this acction',
      );
    }
    let imageUrl: any;
    let imagePublicId: any;

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

    const result = {
      clientId: loggedInClientId,
      title: createJobDto.title,
      description: createJobDto.description,
      budget: createJobDto.budget,
      jobLocation: createJobDto.jobLocation,
      serviceId: createJobDto.serviceId,
      imageUrl,
      imagePublicId,
    };
    return this.jobModel.create(result);
  }

  async getJobs(query: JobQueryDto) {
    return buildQuery(
      this.jobModel,
      query,
      {
        // Regex search  only plain string fields
        textFields: ['title', 'description'],
        // this comment will help your life
        // Dedicated location filter via ?location=Lagos
        locationField: 'jobLocation',

        // These are cast to ObjectId before querying  no cast errors
        objectIdFields: ['serviceId', 'providerId', 'clientId'],

        // These are matched exactly — no regex, safe for enums
        enumFields: ['status'],
      },
      {
        excludeFields: [
          'milestones',
          'imagePublicId',
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
      isDeleted: false, // ✅ Correct field name
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
    const validId = new Types.ObjectId(id);
    if (!validId) {
      throw new BadRequestException('Invalid Mongodb Id');
    }

    const jobs = await this.jobModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!jobs) {
      throw new NotFoundException('NO jobs found with this id');
    }

    return jobs;
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

    // Check for invalid fields FIRST
    const invalidFields = sentFields.filter((f) => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Cannot update fields: ${invalidFields.join(', ')}`,
      );
    }

    // Build update data AFTER validation
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

    // Authorization
    if (job.clientId.toString() !== loggedInUser) {
      throw new UnauthorizedException(
        'You are not authorized to delete this job',
      );
    }

    // Business rule
    if (job.status !== Status.open) {
      throw new BadRequestException(
        'Only jobs with status "open" can be deleted',
      );
    }

    this.jobModel.findByIdAndUpdate(
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

    // Validate provider first
    const provider = await this.userService.findById(providerId);
    if (!provider || provider.roleName !== RoleName.Provider) {
      throw new BadRequestException('Invalid provider');
    }

    // Atomic update with conditions
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: id,
          clientId: loggedInUser,
          status: Status.open,
          providerId: { $exists: false }, // Not already assigned
        },
        {
          $set: {
            providerId: new Types.ObjectId(providerId),
            status: Status.in_progress,
            assignedDate: new Date(),
          },
        },
        { new: true },
      )
      .select(
        '-milestones -imagePublicId -isDeleted -deletedBy -deleteAt -createdAt -updatedAt',
      ); // Exclude sensitive fields

    if (!job) {
      throw new BadRequestException('Job already assigned or not found');
    }

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

    // Can only unassign if job just started (within 1 hour) OR not started yet
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

    return updatedJob;
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

    // 🔐 Client-only access
    if (job.clientId.toString() !== loggedInUser) {
      throw new ForbiddenException(
        'You are not allowed to view bids for this job',
      );
    }

    return this.bidsService.findBidsForJob(job._id.toString());
  }
}
