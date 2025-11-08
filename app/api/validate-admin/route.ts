import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// Load the hashed password from environment variables
// Expected to be base64-encoded to avoid issues with $ characters in .env files
const envHash = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_PASSWORD_HASH = envHash ? Buffer.from(envHash, 'base64').toString('utf-8') : '';

if (!ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH.length !== 60) {
  throw new Error('ADMIN_PASSWORD_HASH is not properly set in environment variables. Must be a base64-encoded bcrypt hash.');
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    // Compare the provided password with the stored hash
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    // Generate a token (for simplicity, using a placeholder here)
    const token = 'secure-token-placeholder';

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error validating admin password:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}