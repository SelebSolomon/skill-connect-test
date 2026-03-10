import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useLogin } from '../../hooks/useAuth';
import { getErrorMessage } from '../../hooks/useErrorMessage';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    login.mutate({ email: data.email, password: data.password });
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
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Connect with the<br />best talent around you
          </h1>
          <p className="mt-4 text-violet-200 text-lg">
            Post jobs, find skilled providers, and get work done — all in one place.
          </p>
        </div>
        <div className="flex gap-8 text-white">
          <div>
            <p className="text-3xl font-bold">500+</p>
            <p className="text-violet-300 text-sm">Verified providers</p>
          </div>
          <div>
            <p className="text-3xl font-bold">1.2k+</p>
            <p className="text-violet-300 text-sm">Jobs posted</p>
          </div>
          <div>
            <p className="text-3xl font-bold">98%</p>
            <p className="text-violet-300 text-sm">Satisfaction rate</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-violet-700 font-bold text-lg lg:hidden mb-6">
              <Zap className="w-5 h-5" />
              SkillLink
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-gray-500">Sign in to your account to continue</p>
          </div>

          {login.error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {getErrorMessage(login.error)}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                error={errors.password?.message}
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

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-violet-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth loading={login.isPending} size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-violet-600 hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
