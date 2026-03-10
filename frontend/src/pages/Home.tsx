import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, Users, Star, Zap, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { JobCard } from '../components/shared/JobCard';
import { ProfileCard } from '../components/shared/ProfileCard';
import { Spinner } from '../components/ui/Spinner';
import { jobsApi } from '../api/jobs.api';
import { profileApi } from '../api/profile.api';
import { servicesApi } from '../api/services.api';

export function HomePage() {
  const { data: jobsData } = useQuery({
    queryKey: ['jobs', { limit: 6 }],
    queryFn: () => jobsApi.getJobs({ limit: 6 }),
  });

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['profiles', { limit: 4 }],
    queryFn: () => profileApi.queryProfiles({ limit: 4 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: servicesApi.getCategories,
  });

  const jobs = jobsData?.data ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-sky-600 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white font-medium mb-6 backdrop-blur-sm">
            <Zap className="w-4 h-4" />
            The fastest way to hire skilled talent
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Find the perfect{' '}
            <span className="text-yellow-300">skill</span>{' '}
            for any job
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-violet-200 max-w-2xl mx-auto">
            Connect with verified local providers for any service — from home repairs to professional services, all in one platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/jobs">
              <Button size="lg" variant="secondary" className="bg-white text-violet-700 hover:bg-violet-50 shadow-xl">
                <Search className="w-5 h-5" />
                Browse Jobs
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 border border-white/30 backdrop-blur-sm shadow-sm">
                Get started free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { icon: <Briefcase className="w-6 h-6 text-violet-600" />, value: '1,200+', label: 'Jobs posted' },
              { icon: <Users className="w-6 h-6 text-violet-600" />, value: '500+', label: 'Verified providers' },
              { icon: <Star className="w-6 h-6 text-violet-600" />, value: '4.9/5', label: 'Average rating' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Categories */}
      {categories && categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse by category</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat: string) => (
                <Link
                  key={cat}
                  to={`/jobs?category=${encodeURIComponent(cat)}`}
                  className="px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-colors shadow-sm"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Latest jobs</h2>
              <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:underline">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Providers */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Top providers</h2>
            <Link to="/providers" className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:underline">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {providersLoading ? (
            <Spinner fullPage />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(providers ?? []).map((profile) => (
                <ProfileCard key={profile._id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-violet-600 to-sky-600">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-3 text-violet-200 text-lg">
            Join thousands of clients and providers on SkillLink today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=client">
              <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50">
                Post a job
              </Button>
            </Link>
            <Link to="/register?role=provider">
              <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 border border-white/30">
                Offer your skills
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
