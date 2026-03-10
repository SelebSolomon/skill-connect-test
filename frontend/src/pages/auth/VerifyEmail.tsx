import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authApi } from '../../api/auth.api';
import { getErrorMessage } from '../../hooks/useErrorMessage';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      setStatus('verifying');
      authApi.verifyEmail(token)
        .then(() => setStatus('success'))
        .catch((err) => {
          setErrorMsg(getErrorMessage(err));
          setStatus('error');
        });
    }
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await authApi.resendVerificationEmail(email);
      setResendSuccess(true);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
                <Mail className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Verifying your email...</h2>
            </div>
          )}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Email verified!</h2>
              <p className="text-gray-500">Your email has been verified. You can now sign in.</p>
              <Link to="/login">
                <Button fullWidth>Go to Login</Button>
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Verification failed</h2>
              <p className="text-gray-500">{errorMsg || 'The link may have expired.'}</p>
              <Link to="/login">
                <Button variant="outline" fullWidth>Back to Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-violet-100 flex items-center justify-center">
          <Mail className="w-10 h-10 text-violet-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-gray-500">
            We sent a verification link to your email address. Click the link to verify your account.
          </p>
        </div>

        {resendSuccess ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4" />
            Verification email sent!
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Didn't receive it? Resend below.</p>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              variant="outline"
              fullWidth
              loading={resendLoading}
              onClick={handleResend}
            >
              <RefreshCw className="w-4 h-4" />
              Resend verification email
            </Button>
          </div>
        )}

        <Link to="/login" className="text-sm text-violet-600 hover:underline block">
          Back to login
        </Link>
      </div>
    </div>
  );
}
