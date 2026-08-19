import { useMutation } from '@tanstack/react-query';
import { generateTradeDescription, type GenerateDescriptionPayload } from '../api/ai.api';

// A plain mutation with no cache side effects: the result is dropped
// straight into a form field by the caller, not stored as query data.
export function useGenerateDescriptionMutation() {
  return useMutation({
    mutationFn: (payload: GenerateDescriptionPayload) => generateTradeDescription(payload),
  });
}
