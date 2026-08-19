import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { TRADE_STATUSES } from './TradeRequest.js';

const statusHistorySchema = new Schema(
  {
    tradeRequestId: { type: Schema.Types.ObjectId, ref: 'TradeRequest', required: true },
    previousStatus: { type: String, enum: TRADE_STATUSES, required: true },
    newStatus: { type: String, enum: TRADE_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  {
    // `createdAt` doubles as `changedAt` — a status change is immutable
    // once recorded, so there's no need for a separate `updatedAt`.
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.changedAt = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

statusHistorySchema.index({ tradeRequestId: 1, createdAt: 1 });

export type StatusHistoryDoc = HydratedDocument<InferSchemaType<typeof statusHistorySchema>>;

export const StatusHistory = model('StatusHistory', statusHistorySchema);
