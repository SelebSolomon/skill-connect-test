import { Model } from 'mongoose';
import {
  QueryBuilderOptions,
  QueryString,
  SearchConfig,
} from '../../interface/query-buider-interface/query-builder-interface';
import { QueryBuilder } from './query-builder';

/**
 * Factory that creates a fully chained QueryBuilder ready to `.exec()`
 *
 * @example
 * // In your service:
 * return buildQuery(this.jobModel, query, {
 *   textFields: ['title', 'description'],
 *   locationField: 'jobLocation',
 *   objectIdFields: ['serviceId', 'providerId', 'clientId'],
 *   enumFields: ['status'],
 * }).exec();
 */
export function buildQuery<T>(
  model: Model<T>,
  queryString: QueryString,
  config: SearchConfig = {},
  options: QueryBuilderOptions = {},
): QueryBuilder<T> {
  return new QueryBuilder(model, queryString, config, options)
    .filter()
    .search()
    .location()
    .sort()
    .fields()
    .paginate();
}
