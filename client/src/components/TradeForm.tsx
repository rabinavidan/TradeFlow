import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tradeFormSchema, type TradeFormValues } from '../schemas/trade.schema';
import { TRADE_REQUEST_TYPES } from '../types/trade';
import { FormField } from './FormField';

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
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

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
        <label htmlFor="description">Description</label>
        <textarea id="description" rows={4} {...register('description')} />
        {errors.description && (
          <p className="form-field-error" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
