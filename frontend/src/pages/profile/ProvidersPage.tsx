import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { profileApi } from '../../api/profile.api';
import { ProfileCard } from '../../components/shared/ProfileCard';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function ProvidersPage() {
  const [search, setSearch] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles', { search, minRate, maxRate, city, page }],
    queryFn: () => profileApi.queryProfiles({
      skills: search || undefined,
      minRate: minRate ? Number(minRate) : undefined,
      maxRate: maxRate ? Number(maxRate) : undefined,
      city: city || undefined,
      page,
      limit: 12,
    }),
  });

  const providers = profiles ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Find Providers</h1>
        <p className="text-gray-500 mt-1">Browse verified skilled providers in your area</p>
      </div>

      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by skill..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-colors"
          />
        </div>
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1); }}
        />
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min $/hr"
            value={minRate}
            onChange={(e) => setMinRate(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max $/hr"
            value={maxRate}
            onChange={(e) => setMaxRate(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner fullPage />
      ) : providers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No providers found</h3>
          <p className="text-gray-500 mt-1">Try different search terms or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {providers.map((profile) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={providers.length < 12}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
