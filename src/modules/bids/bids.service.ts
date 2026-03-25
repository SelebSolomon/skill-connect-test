import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Bid, BidDocument } from './schema/bid.schema';
import { Model, Types } from 'mongoose';
import { Status } from '../jobs/enums/status.enum';
import { BidStatus } from './enums/bid-status-enum';
import { JobsService } from '../jobs/jobs.service';
import path from 'path';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bid.name) private readonly bidModel: Model<BidDocument>,
    @Inject(forwardRef(() => JobsService))
    private jobService: JobsService,
    private notificationsService: NotificationsService,
  ) {}

  async findByProviderAndJob(
    providerId: string,
    jobId: string,
  ): Promise<{ proposedPrice: number } | null> {
    return this.bidModel
      .findOne({
        jobId: new Types.ObjectId(jobId),
        providerId: new Types.ObjectId(providerId),
        withdrawn: false,
      })
      .select('proposedPrice')
      .lean();
  }

  /** Hard-delete all bids for a job (called when the job itself is deleted) */
  async deleteByJob(jobId: string): Promise<void> {
    await this.bidModel.deleteMany({ jobId: new Types.ObjectId(jobId) });
  }

  /** Mark the assigned provider's bid as accepted */
  async markBidAccepted(providerId: string, jobId: string): Promise<void> {
    await this.bidModel.updateOne(
      {
        jobId: new Types.ObjectId(jobId),
        providerId: new Types.ObjectId(providerId),
        withdrawn: false,
      },
      { $set: { status: BidStatus.ACCEPTED, acceptedAt: new Date() } },
    );
  }

  /** Reject all other pending bids for a job once a provider is assigned */
  async rejectOtherBids(
    jobId: string,
    acceptedProviderId: string,
  ): Promise<void> {
    await this.bidModel.updateMany(
      {
        jobId: new Types.ObjectId(jobId),
        providerId: { $ne: new Types.ObjectId(acceptedProviderId) },
        withdrawn: false,
        status: BidStatus.PENDING,
      },
      { $set: { status: BidStatus.REJECTED, rejectedAt: new Date() } },
    );
  }

  async findBidsForJob(jobId: string) {
    return await this.bidModel
      .find({ jobId, withdrawn: false })
      .populate({
        path: 'providerId',
        select: 'profile name', // only bring profile reference
        populate: {
          path: 'profile',
          select: 'photoUrl rating',
        },
      })
      .sort({ createdAt: -1 })
      .select('-__v')
      .exec();
  }
  async submitBid(createBidDto: CreateBidDto, loggedInProvider: string) {
    const { jobId, proposedPrice, estimatedDuration, message } = createBidDto;

    const job = await this.jobService.findById(jobId);
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.status !== Status.open) {
      throw new BadRequestException('Cannot bid on a job that is not open');
    }

    // Only block if there is an active (non-withdrawn) bid from this provider.
    // Withdrawn bids have providerId set to null, so they are invisible to this
    // query and do not block re-bidding. The partial unique index
    // ({ jobId, providerId }, partialFilterExpression: { withdrawn: false })
    // ensures no duplicate active bids at the DB level as well.
    const activeBid = await this.bidModel.findOne({
      jobId: new Types.ObjectId(jobId),
      providerId: new Types.ObjectId(loggedInProvider),
      withdrawn: false,
    });

    if (activeBid) {
      throw new ConflictException(
        'You have already submitted a bid for this job',
      );
    }

    try {
      const bid = new this.bidModel({
        jobId,
        providerId: new Types.ObjectId(loggedInProvider),
        clientId: job.clientId,
        proposedPrice,
        estimatedDuration,
        message,
      });
      const saved = await bid.save();

      // Notify the client (fire-and-forget)
      this.notificationsService
        .send({
          userId: job.clientId.toString(),
          type: NotificationType.Bid,
          title: 'New Bid Received',
          message: `A provider placed a bid of $${proposedPrice} on your job: "${job.title}"`,
          link: `/jobs/${jobId}/bids`,
        })
        .catch(() => null);

      return saved;
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'You have already submitted a bid for this job',
        );
      }
      throw new InternalServerErrorException('Failed to submit bid');
    }
  }

  async getMyBids(providerId: string) {
    return this.bidModel
      .find({
        providerId: new Types.ObjectId(providerId),
        withdrawn: false,
      })
      .sort({ createdAt: -1 })
      .select('proposedPrice estimatedDuration status createdAt jobId')
      .populate({
        path: 'jobId',
        select: 'title budget status jobLocation',
      })
      .lean();
  }

  async getBidById(id: string, loggedInUser: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bid ID');
    }
    const bid = await this.bidModel
      .findOne({ _id: id, withdrawn: false })
      .populate({
        path: 'jobId',
        select: 'title budget status jobLocation',
      })
      .lean();
    if (!bid) {
      throw new NotFoundException('Bid not found');
    }
    if (
      bid.providerId.toString() !== loggedInUser &&
      bid.clientId.toString() !== loggedInUser
    ) {
      throw new BadRequestException(
        'You do not have permission to view this bid',
      );
    }
    return bid;
  }

  async updateBid(
    id: string,
    updateBidDto: UpdateBidDto,
    loggedInUser: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bid ID');
    }
    const bid = await this.bidModel.findOne({ _id: id, withdrawn: false });
    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.providerId.toString() !== loggedInUser) {
      throw new BadRequestException(
        'You do not have permission to update this bid',
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new BadRequestException('Only pending bids can be updated');
    }

    const allowedFields = ['proposedPrice', 'estimatedDuration', 'message'];
    const sentFields = Object.keys(updateBidDto);

    // Validate that only allowed fields are sent
    for (const field of sentFields) {
      if (!allowedFields.includes(field)) {
        throw new BadRequestException(
          `Field '${field}' is not allowed to be updated`,
        );
      }
    }

    const updateData: Partial<UpdateBidDto> = {};
    for (const field of allowedFields) {
      if (updateBidDto[field] !== undefined) {
        updateData[field] = updateBidDto[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    // Update allowed fields
    const updatedBid = await this.bidModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    return updatedBid;
  }

  async withdrawBid(id: string, loggedInUser: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bid ID');
    }
    const bid = await this.bidModel.findOne({ _id: id, withdrawn: false });
    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.providerId.toString() !== loggedInUser) {
      throw new BadRequestException(
        'You do not have permission to withdraw this bid',
      );
    }

    const [updatedBid, job] = await Promise.all([
      this.bidModel.findByIdAndUpdate(
        id,
        {
          withdrawn: true,
          withdrawnAt: new Date(),
          status: BidStatus.WITHDRAWN,
          providerId: null,
        },
        { new: true },
      ),
      this.jobService.findById(bid.jobId.toString()),
    ]);

    // Notify the client that the provider withdrew their bid (fire-and-forget)
    if (job) {
      this.notificationsService
        .send({
          userId: job.clientId.toString(),
          type: NotificationType.Bid,
          title: 'Bid Withdrawn',
          message: `A provider has withdrawn their bid on your job: "${job.title}"`,
          link: `/jobs/${bid.jobId}/bids`,
        })
        .catch(() => null);
    }

    return updatedBid;
  }
}
