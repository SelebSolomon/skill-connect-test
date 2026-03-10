import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { jobsApi } from '../../api/jobs.api';
import { servicesApi } from '../../api/services.api';
import { getErrorMessage } from '../../hooks/useErrorMessage';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  budget: z.coerce.number().min(1, 'Budget must be greater than 0'),
  jobLocation: z.string().min(2, 'Location is required'),
  serviceId: z.string().min(1, 'Please select a service category'),
});

type FormData = z.infer<typeof schema>;

interface Milestone { title: string; description: string }

export function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState('');

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll(),
  });

  const serviceOptions = [
    { value: '', label: 'Select a service category' },
    ...(services ?? []).map((s) => ({ value: s._id, label: s.name })),
  ];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('budget', String(formData.budget));
      fd.append('jobLocation', formData.jobLocation);
      fd.append('serviceId', formData.serviceId);
      if (photo) fd.append('photo', photo);
      if (milestones.length > 0) fd.append('milestones', JSON.stringify(milestones));
      return jobsApi.createJob(fd);
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(`/jobs/${job._id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const addMilestone = () => setMilestones((m) => [...m, { title: '', description: '' }]);
  const removeMilestone = (i: number) => setMilestones((m) => m.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, field: keyof Milestone, value: string) =>
    setMilestones((m) => m.map((ms, idx) => idx === i ? { ...ms, [field]: value } : ms));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
        <p className="mt-1 text-gray-500">Fill in the details to attract the right providers</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
          <div className="space-y-4">
            <Input
              label="Job title"
              placeholder="e.g. Need a plumber to fix kitchen sink"
              error={errors.title?.message}
              {...register('title')}
            />
            <Textarea
              label="Description"
              rows={5}
              placeholder="Describe the work needed, requirements, timeline expectations..."
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget ($)"
                type="number"
                placeholder="e.g. 500"
                error={errors.budget?.message}
                {...register('budget')}
              />
              <Input
                label="Job Location"
                placeholder="e.g. Lagos, Nigeria"
                error={errors.jobLocation?.message}
                {...register('jobLocation')}
              />
            </div>
            <Select
              label="Service Category"
              options={serviceOptions}
              error={errors.serviceId?.message}
              {...register('serviceId')}
            />
          </div>
        </Card>

        {/* Photo upload */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Job Photo</h2>
          <div className="space-y-3">
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
            )}
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
              <ImagePlus className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {photo ? photo.name : 'Click to upload a photo (required)'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </Card>

        {/* Milestones */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Milestones <span className="text-gray-400 font-normal">(optional)</span></h2>
            <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
              <Plus className="w-4 h-4" />
              Add milestone
            </Button>
          </div>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Milestone {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeMilestone(i)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  placeholder="Milestone title"
                  value={m.title}
                  onChange={(e) => updateMilestone(i, 'title', e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={m.description}
                  onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                />
              </div>
            ))}
            {milestones.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No milestones added. Add some to break down the work.
              </p>
            )}
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" fullWidth onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={createMutation.isPending} disabled={!photo}>
            Post Job
          </Button>
        </div>
        {!photo && (
          <p className="text-center text-xs text-red-500">* A job photo is required</p>
        )}
      </form>
    </div>
  );
}
