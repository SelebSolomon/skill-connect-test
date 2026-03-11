import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument, ReportStatus } from './schema/report.schema';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  /** Any authenticated user submits a report */
  async submitReport(dto: CreateReportDto, reporterId: string): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(dto.targetId)) {
      throw new BadRequestException('Invalid target ID');
    }

    try {
      return await this.reportModel.create({
        ...dto,
        targetId: new Types.ObjectId(dto.targetId),
        reporterId: new Types.ObjectId(reporterId),
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('You have already reported this target');
      }
      throw err;
    }
  }

  /** Reports submitted by the current user */
  async getMyReports(reporterId: string, page = 1, limit = 20) {
    const filter = { reporterId: new Types.ObjectId(reporterId) };
    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reportModel.countDocuments(filter),
    ]);
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  /** Admin: list all reports with optional status filter */
  async getAllReports(status?: ReportStatus, page = 1, limit = 20) {
    const filter = status ? { status } : {};
    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate('reporterId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reportModel.countDocuments(filter),
    ]);
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Admin: update a report's status with optional notes */
  async resolveReport(
    reportId: string,
    adminId: string,
    status: ReportStatus.Reviewed | ReportStatus.Dismissed | ReportStatus.Actioned,
    adminNotes?: string,
  ): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes: adminNotes ?? null,
        resolvedBy: new Types.ObjectId(adminId),
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
