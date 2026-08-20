import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerFormSchema, type RegisterFormValues } from '../schemas/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../api/client';
import { FormField } from '../components/FormField';

export function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create your account. Please try again.'));
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
            <h1>Create an account</h1>

            {apiError && (
              <p className="form-error" role="alert">
                {apiError}
              </p>
            )}

            <FormField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
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
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Register'}
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
