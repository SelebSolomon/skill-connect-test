export interface QueryString {
  page?: string | number; // accepts number (from DTO @Type transform) or string (raw query param)
  limit?: string | number;
  sort?: string;
  fields?: string;
  search?: string;
  location?: string;
  [key: string]: any;
}

export interface SearchConfig {
  /** Plain string fields for regex search via ?search= */
  textFields?: string[];
  /** Field used for ?location= regex search */
  locationField?: string;
  /** ObjectId reference fields — auto-cast, no cast errors */
  objectIdFields?: string[];
  /** Enum fields — exact match only, no regex */
  enumFields?: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface QueryBuilderOptions {
  /** Default sort field. Defaults to '-createdAt' */
  defaultSort?: string;
  /** Maximum allowed limit. Defaults to 100 */
  maxLimit?: number;
  /** Default limit per page. Defaults to 20 */
  defaultLimit?: number;
  /**
   * Fields to always exclude from results — regardless of ?fields= param.
   * Use this to permanently hide sensitive fields from API consumers.
   * @example ['milestones', 'imagePublicId', 'isDeleted', 'deletedBy', 'deleteAt']
   */
  excludeFields?: string[];
}
