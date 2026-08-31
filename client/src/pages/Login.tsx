import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../api/client';
import { FormField } from '../components/FormField';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      await login(values);
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not sign in. Please try again.'));
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <span className="auth-brand-dot" aria-hidden="true" />
            TradeFlow
          </div>
          <p className="auth-tagline">Every approval, traced from draft to signature.</p>
          <p className="auth-foot">Trade‑finance workflow demo</p>
        </div>
        <div className="auth-panel">
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <h1>Log in</h1>

            {apiError && (
              <p className="form-error" role="alert">
                {apiError}
              </p>
            )}

            <FormField
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <FormField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Log in'}
            </button>

            <p className="auth-switch">
              Don&apos;t have an account? <Link to="/register">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
