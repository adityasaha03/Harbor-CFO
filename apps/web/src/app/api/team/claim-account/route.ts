import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      message:
        'Account registration or claiming via sign up is disabled for existing users and employees. Please sign in directly on the Sign In page.',
    },
    { status: 403 },
  );
}
