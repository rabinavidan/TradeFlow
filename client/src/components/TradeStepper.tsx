import type { TradeStatus } from '../types/trade';

const PIPELINE: TradeStatus[] = ['Draft', 'Submitted', 'In Review', 'Approved'];

/**
 * Draws the same Draft → Submitted → In Review → Approved/Rejected pipeline
 * that server/src/services/workflow.service.ts enforces, so the state
 * machine that makes this app interesting is visible, not just implied by
 * a status badge.
 */
export function TradeStepper({ status }: { status: TradeStatus }) {
  const isRejected = status === 'Rejected';
  const currentIndex = isRejected ? PIPELINE.length - 1 : PIPELINE.indexOf(status);

  return (
    <ol className="stepper" aria-label="Approval pipeline">
      {PIPELINE.map((step, index) => {
        const isLast = index === PIPELINE.length - 1;
        const label = isRejected && isLast ? 'Rejected' : step;
        const state = isRejected && isLast
          ? 'rejected'
          : index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming';

        return (
          <li key={step} className={`step step-${state}`}>
            <span className="step-node" aria-hidden="true">
              {state === 'done' ? '✓' : state === 'rejected' ? '✕' : index + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
