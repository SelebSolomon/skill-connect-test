import { Link } from 'react-router-dom';
import { MapPin, Star, DollarSign, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Profile, User } from '../../types';

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const user = profile.userId as User | undefined;
  const userId = typeof profile.userId === 'string' ? profile.userId : (profile.userId as User)?._id;

  return (
    <Link to={`/providers/${userId}`}>
      <Card hover className="flex flex-col gap-4 h-full">
        <div className="flex items-start gap-3">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={user?.name ?? 'Provider'}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {(user?.name ?? 'P').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-gray-900 truncate">{user?.name ?? 'Provider'}</h3>
              {profile.verified && (
                <CheckCircle className="w-4 h-4 text-violet-500 shrink-0" />
              )}
            </div>
            {profile.title && (
              <p className="text-sm text-gray-500 truncate">{profile.title}</p>
            )}
            {profile.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="primary">{skill}</Badge>
            ))}
            {profile.skills.length > 4 && (
              <Badge variant="neutral">+{profile.skills.length - 4}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 mt-auto text-sm">
          {profile.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Star className="w-4 h-4 fill-amber-500" />
              {profile.ratingAvg.toFixed(1)}
              <span className="text-gray-400 font-normal">({profile.ratingCount})</span>
            </span>
          )}
          {profile.rate != null && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <DollarSign className="w-3.5 h-3.5" />
              {profile.rate}/hr
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
