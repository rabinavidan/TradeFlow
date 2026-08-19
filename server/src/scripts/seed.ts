import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { TradeRequest } from '../models/TradeRequest.js';
import { StatusHistory } from '../models/StatusHistory.js';
import { registerUser } from '../services/auth.service.js';
import { createTrade } from '../services/trade.service.js';
import { changeTradeStatus } from '../services/workflow.service.js';
import type { AccessTokenPayload } from '../utils/jwt.js';

/**
 * Wipes and repopulates the database with a realistic demo dataset — three
 * users (one per role) and trade requests spanning every workflow status.
 * Deliberately destructive (drops all Users/TradeRequests/StatusHistory
 * first) so re-running it always produces a clean, known demo state; guarded
 * against production to make that destructiveness hard to trigger by
 * accident against a real dataset.
 *
 * Usage: npm run seed --workspace server
 */
const DEMO_PASSWORD = 'demo-password-123';

const DEMO_USERS = [
  { name: 'Dana Owner', email: 'user@tradeflow.demo', role: 'user' as const },
  { name: 'Rio Reviewer', email: 'reviewer@tradeflow.demo', role: 'reviewer' as const },
  { name: 'Ada Admin', email: 'admin@tradeflow.demo', role: 'admin' as const },
];

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the destructive seed script against NODE_ENV=production');
  }

  await connectDB();

  await Promise.all([User.deleteMany({}), TradeRequest.deleteMany({}), StatusHistory.deleteMany({})]);
  logger.info('Cleared existing demo data');

  const created: Record<string, AccessTokenPayload> = {};
  for (const demoUser of DEMO_USERS) {
    const { user } = await registerUser({
      name: demoUser.name,
      email: demoUser.email,
      password: DEMO_PASSWORD,
    });
    if (demoUser.role !== 'user') {
      await User.findByIdAndUpdate(user.id, { role: demoUser.role });
    }
    created[demoUser.role] = { sub: user.id, role: demoUser.role };
  }

  const owner = created.user;
  const reviewer = created.reviewer;

  const draft = await createTrade(
    {
      title: 'Machinery import financing',
      customerName: 'Meridian Steelworks',
      amount: 82000,
      currency: 'USD',
      country: 'Vietnam',
      requestType: 'Letter of Credit',
      description: 'Financing for a batch of CNC machinery imported from a supplier in Germany.',
    },
    owner,
  );

  const submitted = await createTrade(
    {
      title: 'Textile export guarantee',
      customerName: 'Bluewave Textiles',
      amount: 41500,
      currency: 'EUR',
      country: 'Portugal',
      requestType: 'Guarantee',
      description: 'Performance guarantee backing a textile export contract.',
    },
    owner,
  );
  await changeTradeStatus(submitted.id, 'Submitted', 'Ready for review.', owner);

  const inReview = await createTrade(
    {
      title: 'Coffee bean collection request',
      customerName: 'Altiplano Traders',
      amount: 15750,
      currency: 'USD',
      country: 'Colombia',
      requestType: 'Collection',
      description: 'Documentary collection for a shipment of green coffee beans.',
    },
    owner,
  );
  await changeTradeStatus(inReview.id, 'Submitted', 'Ready for review.', owner);
  await changeTradeStatus(inReview.id, 'In Review', 'Checking supporting documents.', reviewer);

  const approved = await createTrade(
    {
      title: 'Pharmaceutical shipment financing',
      customerName: 'Norhaven Pharma',
      amount: 128000,
      currency: 'USD',
      country: 'India',
      requestType: 'Letter of Credit',
      description: 'Import financing for a temperature-controlled pharmaceutical shipment.',
    },
    owner,
  );
  await changeTradeStatus(approved.id, 'Submitted', 'Ready for review.', owner);
  await changeTradeStatus(approved.id, 'In Review', 'All documents present.', reviewer);
  await changeTradeStatus(approved.id, 'Approved', 'Approved — terms are standard.', reviewer);

  const rejected = await createTrade(
    {
      title: 'Used equipment export guarantee',
      customerName: 'Falkirk Industrial',
      amount: 9200,
      currency: 'GBP',
      country: 'Nigeria',
      requestType: 'Guarantee',
      description: 'Guarantee request for a shipment of used industrial equipment.',
    },
    owner,
  );
  await changeTradeStatus(rejected.id, 'Submitted', 'Ready for review.', owner);
  await changeTradeStatus(rejected.id, 'In Review', 'Reviewing documentation.', reviewer);
  await changeTradeStatus(
    rejected.id,
    'Rejected',
    'Missing required export compliance documentation.',
    reviewer,
  );

  logger.info(
    { trades: [draft.id, submitted.id, inReview.id, approved.id, rejected.id].length },
    'Seed complete',
  );

  // eslint-disable-next-line no-console
  console.log(`
Demo accounts (all use the password: ${DEMO_PASSWORD})
  user@tradeflow.demo      — role: user      (owns every seeded trade request)
  reviewer@tradeflow.demo  — role: reviewer  (can move requests through review)
  admin@tradeflow.demo     — role: admin     (sees and can act on everything)
`);

  await disconnectDB();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
