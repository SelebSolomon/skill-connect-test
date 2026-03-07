import { Model, Query, Types, isValidObjectId } from 'mongoose';
import {
  PaginatedResult,
  QueryBuilderOptions,
  QueryString,
  SearchConfig,
} from '../../interface/query-buider-interface/query-builder-interface';

const EXCLUDED_KEYS = ['page', 'sort', 'limit', 'fields', 'search', 'location'];
const MONGO_OPERATORS = /\b(gte|gt|lte|lt|in|nin|ne|eq)\b/g;
const DEFAULT_OPTIONS: Required<QueryBuilderOptions> = {
  defaultSort: '-createdAt',
  maxLimit: 100,
  defaultLimit: 20,
  excludeFields: [],
};

export class QueryBuilder<T> {
  private query: Query<T[], T>;
  private countQuery: Record<string, any> = {};

  private readonly model: Model<T>;
  private readonly qs: QueryString;
  private readonly config: SearchConfig;
  private readonly options: Required<QueryBuilderOptions>;

  constructor(
    model: Model<T>,
    queryString: QueryString,
    config: SearchConfig = {},
    options: QueryBuilderOptions = {},
  ) {
    this.model = model;
    this.qs = queryString;
    this.config = config;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.query = model.find();
  }

  // Filter: handles ?field=value, ?field[gte]=value, ObjectId casting
  filter(): this {
    const raw = { ...this.qs };
    EXCLUDED_KEYS.forEach((k) => delete raw[k]);

    let queryStr = JSON.stringify(raw);
    queryStr = queryStr.replace(MONGO_OPERATORS, (match) => `$${match}`);
    const parsed: Record<string, any> = JSON.parse(queryStr);

    // Cast known ObjectId fields — prevents Mongoose cast errors
    this.config.objectIdFields?.forEach((field) => {
      if (parsed[field]) {
        const val = parsed[field];
        if (Array.isArray(val)) {
          parsed[field] = val
            .filter((v) => isValidObjectId(v))
            .map((v) => new Types.ObjectId(v));
        } else if (isValidObjectId(val)) {
          parsed[field] = new Types.ObjectId(val);
        } else {
          delete parsed[field];
        }
      }
    });

    // Handle ?field[in]=a,b,c as arrays
    for (const key of Object.keys(parsed)) {
      const val = parsed[key];
      if (
        val &&
        typeof val === 'object' &&
        val.$in &&
        typeof val.$in === 'string'
      ) {
        parsed[key].$in = val.$in.split(',');
      }
    }

    this.query = this.query.find(parsed);
    Object.assign(this.countQuery, parsed);
    return this;
  }

  // Search: regex across configured textFields via ?search=
  search(): this {
    const keyword = this.qs.search?.trim();
    if (!keyword || !this.config.textFields?.length) return this;

    const regex = new RegExp(keyword, 'i');
    const condition = {
      $or: this.config.textFields.map((field) => ({ [field]: regex })),
    };

    this.query = this.query.find(condition as any);
    this.mergeCount(condition);
    return this;
  }

  // Location: regex on locationField via ?location=
  location(): this {
    const loc = this.qs.location?.trim();
    if (!loc) return this;

    const field = this.config.locationField ?? 'location';
    const condition = { [field]: new RegExp(loc, 'i') };

    this.query = this.query.find(condition as any);
    this.mergeCount(condition);
    return this;
  }

  // Sort: ?sort=-createdAt,title
  sort(): this {
    const sortStr = this.qs.sort
      ? this.qs.sort.split(',').join(' ')
      : this.options.defaultSort;

    this.query = this.query.sort(sortStr);
    return this;
  }

  // Fields: ?fields=title,status,budget
  // excludeFields in options are always stripped, even if caller requests them
  fields(): this {
    const excluded = this.options.excludeFields.map((f) => `-${f}`).join(' ');

    if (this.qs.fields) {
      // User requested specific fields — still strip excluded ones
      const requested = this.qs.fields.split(',').join(' ');
      const selection = [requested, excluded].filter(Boolean).join(' ');
      this.query = this.query.select(selection);
    } else {
      // No field selection — exclude __v plus any configured excludeFields
      const selection = ['-__v', excluded].filter(Boolean).join(' ');
      this.query = this.query.select(selection);
    }
    return this;
  }

  // Paginate: ?page=1&limit=20
  paginate(): this {
    const { page, limit } = this.parsePagination();
    this.query = this.query.skip((page - 1) * limit).limit(limit);
    return this;
  }

  // Execute: runs data + count queries in parallel
  // baseFilter: always-applied filter (e.g. scope to current user) merged before executing
  async exec(
    baseFilter: Record<string, any> = {},
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = this.parsePagination();

    if (Object.keys(baseFilter).length) {
      this.query = this.query.find(baseFilter);
      if (baseFilter.$or && this.countQuery.$or) {
        this.countQuery.$and = [
          { $or: this.countQuery.$or },
          { $or: baseFilter.$or },
        ];
        delete this.countQuery.$or;
      } else {
        Object.assign(this.countQuery, baseFilter);
      }
    }

    const [data, total] = await Promise.all([
      this.query.exec(),
      this.model.countDocuments(this.countQuery).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // Helpers
  private parsePagination(): { page: number; limit: number } {
    const toInt = (
      val: string | number | undefined,
      fallback: number,
    ): number => {
      if (typeof val === 'number') return val;
      return parseInt(val ?? String(fallback), 10) || fallback;
    };

    const page = Math.max(toInt(this.qs.page, 1), 1);
    const limit = Math.min(
      toInt(this.qs.limit, this.options.defaultLimit),
      this.options.maxLimit,
    );
    return { page, limit };
  }

  private mergeCount(condition: Record<string, any>): void {
    if (condition.$or && this.countQuery.$or) {
      this.countQuery.$and = [
        { $or: this.countQuery.$or },
        { $or: condition.$or },
      ];
      delete this.countQuery.$or;
    } else {
      Object.assign(this.countQuery, condition);
    }
  }
}
