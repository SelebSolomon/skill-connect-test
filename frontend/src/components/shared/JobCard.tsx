import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react';
import { Card } from '../ui/Card';
import { jobStatusBadge } from '../ui/Badge';
import { format } from 'date-fns';
import type { Job, Service, User } from '../../types';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const service = job.serviceId as Service | undefined;
  const serviceName = typeof service === 'object' ? service?.name : 'Uncategorized';

  return (
    <Link to={`/jobs/${job._id}`}>
      <Card hover className="h-full flex flex-col gap-4">
        {job.imageUrl && (
          <img
            src={job.imageUrl}
            alt={job.title}
            className="w-full h-40 object-cover rounded-xl"
          />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-base leading-tight">
              {job.title}
            </h3>
            <p className="text-xs text-violet-600 font-medium mt-0.5">{serviceName}</p>
          </div>
          {jobStatusBadge(job.status)}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
          {job.budget != null && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
              <DollarSign className="w-4 h-4" />
              {job.budget.toLocaleString()}
            </span>
          )}
          {job.jobLocation && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {job.jobLocation}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(job.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
      </Card>
    </Link>
  );
}
