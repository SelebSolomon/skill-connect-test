import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { JobCard } from '../../components/shared/JobCard';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { jobsApi } from '../../api/jobs.api';
import { servicesApi } from '../../api/services.api';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const sortOptions = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-budget', label: 'Highest budget' },
  { value: 'budget', label: 'Lowest budget' },
];

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: servicesApi.getCategories,
  });

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { search, status, sort, page, category: selectedCategory }],
    queryFn: () => jobsApi.getJobs({
      search: search || undefined,
      status: (status as any) || undefined,
      sort: sort || undefined,
      page,
      limit: 12,
    }),
  });

  const jobs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categories ?? []).map((c: string) => ({ value: c, label: c })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
        <p className="mt-1 text-gray-500">
          {data?.total ?? 0} jobs available
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs by title or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters((p) => !p)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {(status || selectedCategory) && (
            <span className="w-2 h-2 rounded-full bg-violet-500" />
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
          <Select
            label="Category"
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
          <Select
            label="Sort by"
            options={sortOptions}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <Spinner fullPage />
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No jobs found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setStatus(''); setSelectedCategory(''); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
