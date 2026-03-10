import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { profileApi } from '../../api/profile.api';
import { servicesApi } from '../../api/services.api';
import { getErrorMessage } from '../../hooks/useErrorMessage';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  bio: z.string().max(2000).optional(),
  rate: z.coerce.number().min(0).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: servicesApi.getCategories,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const fd = new FormData();
      fd.append('title', data.title);
      if (data.bio) fd.append('bio', data.bio);
      if (data.rate) fd.append('rate', String(data.rate));
      if (data.city) fd.append('location[city]', data.city);
      if (data.country) fd.append('location[country]', data.country);
      skills.forEach((s) => fd.append('skills[]', s));
      selectedCategories.forEach((c) => fd.append('categories[]', c));
      if (photo) fd.append('photo', photo);
      return profileApi.createProfile(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      navigate('/profile/me');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Your Profile</h1>
        <p className="mt-1 text-gray-500">Set up your profile to attract clients and win bids</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Basic Info</h2>
          <div className="space-y-4">
            <Input
              label="Professional title"
              placeholder="e.g. Expert Plumber & HVAC Technician"
              error={errors.title?.message}
              {...register('title')}
            />
            <Textarea
              label="Bio"
              rows={4}
              placeholder="Tell clients about yourself, your experience, and what makes you stand out..."
              error={errors.bio?.message}
              {...register('bio')}
            />
            <Input
              label="Hourly rate ($)"
              type="number"
              placeholder="e.g. 50"
              error={errors.rate?.message}
              {...register('rate')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                placeholder="e.g. Lagos"
                {...register('city')}
              />
              <Input
                label="Country"
                placeholder="e.g. Nigeria"
                {...register('country')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <ImagePlus className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <label className="cursor-pointer">
              <span className="text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors">
                {photo ? 'Change photo' : 'Upload photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
                }}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Skills</h2>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Add a skill (e.g. Plumbing)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-medium"
              >
                {skill}
                <button type="button" onClick={() => setSkills(skills.filter((s) => s !== skill))}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </Card>

        {categories && categories.length > 0 && (
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Service Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selectedCategories.includes(cat)
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" fullWidth onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={createMutation.isPending}>
            Create Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
