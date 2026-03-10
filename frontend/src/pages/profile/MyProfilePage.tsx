import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Star, DollarSign, CheckCircle, Pencil, Plus } from 'lucide-react';
import { profileApi } from '../../api/profile.api';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function MyProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.getMyProfile,
  });

  if (isLoading) return <Spinner fullPage />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-violet-100 flex items-center justify-center mb-6">
          <Plus className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create your profile</h2>
        <p className="text-gray-500 mt-2">Set up your provider profile to start receiving job offers and bids</p>
        <Link to="/profile/create">
          <Button className="mt-6">Create Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <Link to="/profile/edit">
          <Button variant="outline">
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Card className="text-center">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center text-white text-3xl font-bold mx-auto">
                P
              </div>
            )}
            <div className="mt-4">
              {profile.verified && (
                <div className="flex items-center justify-center gap-1 text-violet-600 text-sm font-medium mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </div>
              )}
              {profile.title && <p className="font-medium text-gray-900">{profile.title}</p>}
              {profile.rate != null && (
                <p className="text-lg font-bold text-emerald-600 flex items-center justify-center gap-1 mt-1">
                  <DollarSign className="w-4 h-4" />{profile.rate}/hr
                </p>
              )}
              {profile.ratingCount > 0 && (
                <div className="flex items-center justify-center gap-1 text-sm mt-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-medium">{profile.ratingAvg.toFixed(1)}</span>
                  <span className="text-gray-400">({profile.ratingCount})</span>
                </div>
              )}
              {profile.location && (
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </Card>

          {(profile.skills?.length ?? 0) > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(profile.skills ?? []).map((skill) => (
                  <Badge key={skill} variant="primary">{skill}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {profile.bio && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Bio</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </Card>
          )}

          {(profile.portfolio?.length ?? 0) > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Portfolio ({profile.portfolio?.length})</h2>
              <div className="grid grid-cols-2 gap-4">
                {(profile.portfolio ?? []).map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-28 object-cover" />
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
