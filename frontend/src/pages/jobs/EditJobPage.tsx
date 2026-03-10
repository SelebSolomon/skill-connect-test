import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { jobsApi } from '../../api/jobs.api';
import { getErrorMessage } from '../../hooks/useErrorMessage';
import { useState } from 'react';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  budget: z.coerce.number().min(1, 'Budget must be greater than 0'),
  jobLocation: z.string().min(2, 'Location is required'),
});

type FormData = z.infer<typeof schema>;

export function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getJobById(id!),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        description: job.description,
        budget: job.budget,
        jobLocation: job.jobLocation,
      });
    }
  }, [job, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => jobsApi.updateJob(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      navigate(`/jobs/${id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <Spinner fullPage />;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
        <p className="mt-1 text-gray-500">Update your job details</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Input
              label="Job title"
              error={errors.title?.message}
              {...register('title')}
            />
            <Textarea
              label="Description"
              rows={5}
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget ($)"
                type="number"
                error={errors.budget?.message}
                {...register('budget')}
              />
              <Input
                label="Job Location"
                error={errors.jobLocation?.message}
                {...register('jobLocation')}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" fullWidth onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
