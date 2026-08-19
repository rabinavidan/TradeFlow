import bcrypt from 'bcrypt';
import { User, type UserDoc } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken } from '../utils/jwt.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

const SALT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserDoc['role'];
  createdAt: Date;
}

function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function registerUser(
  input: RegisterInput,
): Promise<{ user: PublicUser; token: string }> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('EMAIL_IN_USE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });

  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { user: toPublicUser(user), token };
}

export async function loginUser(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { user: toPublicUser(user), token };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user) {
    throw AppError.notFound('USER_NOT_FOUND', 'User was not found');
  }
  return toPublicUser(user);
}
