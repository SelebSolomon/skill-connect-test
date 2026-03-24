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

  async findBidsForJob(jobId: string) {
    return await this.bidModel
      .find({ jobId })
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

    // Validate job existence and status
    const job = await this.jobService.findById(jobId);
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.status !== Status.open) {
      throw new BadRequestException('Cannot bid on a job that is not open');
    }

    // Create and save the bid

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

      // Notify the client that a new bid arrived (fire-and-forget)
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
      // ✅ DUPLICATE BID
      if (error?.code === 11000) {
        throw new ConflictException(
          'You have already submitted a bid for this job',
        );
      }
    }
    throw new InternalServerErrorException('Failed to submit bid');
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

    const updatedBid = await this.bidModel.findByIdAndUpdate(
      id,
      { withdrawn: true },
      { new: true },
    );
    return updatedBid;
  }
}
