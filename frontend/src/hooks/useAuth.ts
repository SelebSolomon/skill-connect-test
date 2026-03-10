import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';
import type { AuthUser, RegisterDto } from '../types';

// Decode JWT payload without verifying signature (safe for reading claims client-side)
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Step 1: get tokens
      const tokens = await authApi.login(email, password);

      // Step 2: store tokens immediately so subsequent requests have Authorization header
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Step 3: fetch full user profile
      const userResponse: any = await usersApi.me();

      // /users/me wraps payload in { status, data: { user } } inside the global envelope
      const userDoc =
        userResponse?.data?.user ??
        userResponse?.user ??
        userResponse;

      // Step 4: decode JWT for sub (userId)
      const jwtPayload = decodeJwt(tokens.accessToken);

      const authUser: AuthUser = {
        sub: (jwtPayload.sub as string) ?? userDoc?._id ?? '',
        name: userDoc?.name ?? '',
        email: userDoc?.email ?? '',
        role: (userDoc?.roleName ?? 'client') as AuthUser['role'],
      };

      return { tokens, authUser };
    },

    onSuccess: ({ tokens, authUser }) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(authUser);
      queryClient.clear();

      if (authUser.role === 'client') navigate('/jobs/my');
      else if (authUser.role === 'provider') navigate('/bids/my');
      else navigate('/jobs');
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (dto: RegisterDto) => authApi.register(dto),
    onSuccess: () => {
      navigate('/verify-email');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}
