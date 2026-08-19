import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tradeFormSchema, type TradeFormValues } from '../schemas/trade.schema';
import { TRADE_REQUEST_TYPES } from '../types/trade';
import { FormField } from './FormField';
import { useGenerateDescriptionMutation } from '../hooks/useAi';
import { getApiErrorMessage } from '../api/client';

interface TradeFormProps {
  defaultValues?: Partial<TradeFormValues>;
  onSubmit: (values: TradeFormValues) => Promise<void> | void;
  submitLabel: string;
  apiError?: string | null;
}

const EMPTY_DEFAULTS: TradeFormValues = {
  title: '',
  customerName: '',
  amount: 0,
  currency: '',
  country: '',
  requestType: 'Letter of Credit',
  description: '',
};

/**
 * Shared between CreateTrade and EditTrade — one schema, one set of
 * fields, one submit button, reused via props instead of copy-pasted.
 */
export function TradeForm({ defaultValues, onSubmit, submitLabel, apiError }: TradeFormProps) {
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  const generateDescription = useGenerateDescriptionMutation();

  // Optional AI convenience feature (Phase 10): drafts a description from
  // whatever fields are already filled in. Best-effort — if Ollama isn't
  // running locally, the mutation fails and we just show an inline notice;
  // the rest of the form works identically either way.
  function handleGenerateDescription() {
    const { title, customerName, amount, currency, country, requestType } = getValues();
    if (!title || title.trim().length < 3) {
      return;
    }
    generateDescription.mutate(
      {
        title,
        customerName: customerName || undefined,
        amount: amount > 0 ? amount : undefined,
        currency: currency || undefined,
        country: country || undefined,
        requestType,
      },
      { onSuccess: (description) => setValue('description', description, { shouldValidate: true }) },
    );
  }

  return (
    <form className="trade-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {apiError && (
        <p className="form-error" role="alert">
          {apiError}
        </p>
      )}

      <FormField label="Title" error={errors.title?.message} {...register('title')} />
      <FormField
        label="Customer name"
        error={errors.customerName?.message}
        {...register('customerName')}
      />

      <div className="form-row">
        <FormField
          label="Amount"
          type="number"
          step="0.01"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <FormField
          label="Currency"
          placeholder="USD"
          maxLength={3}
          error={errors.currency?.message}
          {...register('currency')}
        />
      </div>

      <FormField label="Country" error={errors.country?.message} {...register('country')} />

      <div className="form-field">
        <label htmlFor="requestType">Request type</label>
        <select id="requestType" {...register('requestType')}>
          {TRADE_REQUEST_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.requestType && (
          <p className="form-field-error" role="alert">
            {errors.requestType.message}
          </p>
        )}
      </div>

      <div className="form-field">
        <div className="form-field-label-row">
          <label htmlFor="description">Description</label>
          <button
            type="button"
            className="ai-generate-button"
            onClick={handleGenerateDescription}
            disabled={generateDescription.isPending}
          >
            {generateDescription.isPending ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
        <textarea id="description" rows={4} {...register('description')} />
        {errors.description && (
          <p className="form-field-error" role="alert">
            {errors.description.message}
          </p>
        )}
        {generateDescription.isError && (
          <p className="form-field-hint" role="status">
            {getApiErrorMessage(
              generateDescription.error,
              'AI description generation is unavailable right now — write one manually.',
            )}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
