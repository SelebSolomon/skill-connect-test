import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useRegister } from '../../hooks/useAuth';
import { getErrorMessage } from '../../hooks/useErrorMessage';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  roleName: z.enum(['client', 'provider']).default('client'),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleName: 'client' },
  });

  const selectedRole = watch('roleName');

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-700 to-sky-600 p-12 flex-col justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Zap className="w-5 h-5" />
          </div>
          SkillLink
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Start your journey<br />on SkillLink
          </h1>
          <div className="space-y-4">
            {[
              { role: 'client', desc: 'Post jobs and hire skilled providers in your area' },
              { role: 'provider', desc: 'Showcase your skills and earn from your expertise' },
            ].map((item) => (
              <div
                key={item.role}
                className={`p-4 rounded-xl border ${
                  selectedRole === item.role
                    ? 'bg-white/20 border-white/40'
                    : 'bg-white/5 border-white/10'
                } transition-all`}
              >
                <p className="text-white font-semibold capitalize">{item.role}</p>
                <p className="text-violet-200 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-violet-300 text-sm">
          Join thousands of people already using SkillLink
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-violet-700 font-bold text-lg lg:hidden mb-6">
              <Zap className="w-5 h-5" />
              SkillLink
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-1.5 text-gray-500">Fill in the details to get started</p>
          </div>

          {registerMutation.error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {getErrorMessage(registerMutation.error)}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="I want to"
              options={[
                { value: 'client', label: 'Hire — post jobs and find providers' },
                { value: 'provider', label: 'Work — offer my skills and bid on jobs' },
              ]}
              error={errors.roleName?.message}
              {...register('roleName')}
            />

            <Input
              label="Full name"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone number"
              type="tel"
              placeholder="+1 234 567 8900"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                error={errors.password?.message}
                hint="Min. 6 chars with a number, uppercase, and symbol"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" fullWidth loading={registerMutation.isPending} size="lg" className="mt-2">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-violet-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
