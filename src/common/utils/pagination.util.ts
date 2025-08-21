import { PaginationDto, PaginationResult } from 'src/common/dto/pagination.dto';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationOptions(
  paginationDto: PaginationDto,
): PaginationOptions {
  const page = paginationDto.page || 1;
  const limit = paginationDto.limit || 10;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

export function createPaginationResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginationResult<T> {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination_data: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };
}
