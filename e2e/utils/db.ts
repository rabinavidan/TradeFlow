import mongoose from 'mongoose';

const E2E_MONGO_URI = 'mongodb://127.0.0.1:27117/tradeflow-e2e';

/**
 * Test-only backdoor: promotes a user's role directly in the database.
 * There's deliberately no UI/API for this (see Phase 4 — role assignment
 * is an admin/ops concern), so the "reviewer approves a request" E2E
 * scenario needs a way around the normal product surface to set up its
 * fixture. Connects directly to the E2E server's pinned MongoDB port.
 */
export async function promoteUserRole(email: string, role: 'reviewer' | 'admin'): Promise<void> {
  const connection = await mongoose.createConnection(E2E_MONGO_URI).asPromise();
  await connection.collection('users').updateOne({ email }, { $set: { role } });
  await connection.close();
}
