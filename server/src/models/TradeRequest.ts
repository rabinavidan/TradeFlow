import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const TRADE_STATUSES = ['Draft', 'Submitted', 'In Review', 'Approved', 'Rejected'] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const TRADE_REQUEST_TYPES = ['Letter of Credit', 'Guarantee', 'Collection', 'Other'] as const;
export type TradeRequestType = (typeof TRADE_REQUEST_TYPES)[number];

const tradeRequestSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    country: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    requestType: { type: String, enum: TRADE_REQUEST_TYPES, required: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: TRADE_STATUSES, default: 'Draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Supports the trade list's default view (a user's own requests, newest
// first) and the dashboard/reviewer view (all requests filtered by status).
tradeRequestSchema.index({ createdBy: 1, createdAt: -1 });
tradeRequestSchema.index({ status: 1, createdAt: -1 });
// Backs the free-text search box on the trade list.
tradeRequestSchema.index({ title: 'text', customerName: 'text' });

export type TradeRequestDoc = HydratedDocument<InferSchemaType<typeof tradeRequestSchema>>;

export const TradeRequest = model('TradeRequest', tradeRequestSchema);
