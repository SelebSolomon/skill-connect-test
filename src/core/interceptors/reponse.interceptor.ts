import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '../../common/interface/query-buider-interface/query-builder-interface';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | T[];
  meta?: PaginatedResult<T>['meta'];
}

/**
 * Wraps all responses in a consistent envelope:
 * { success, message, data, meta? }
 *
 * Apply globally in main.ts:
 *   app.useGlobalInterceptors(new TransformResponseInterceptor());
 *
 * Or per-controller / per-route via @UseInterceptors(TransformResponseInterceptor)
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // Paginated result — has { data, meta }
        if (this.isPaginated(response)) {
          return {
            success: true,
            message: 'Data fetched successfully',
            data: response.data,
            meta: response.meta,
          };
        }

        // Plain data
        return {
          success: true,
          message: 'Data fetched successfully',
          data: response,
        };
      }),
    );
  }

  private isPaginated(val: any): val is PaginatedResult<T> {
    return (
      val &&
      typeof val === 'object' &&
      Array.isArray(val.data) &&
      val.meta &&
      typeof val.meta.total === 'number'
    );
  }
}
