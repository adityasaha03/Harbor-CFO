import { NextResponse } from 'next/server';
import { mongoDb } from '@/features/auth/server/mongo';
import { testMemoryDb } from '@/features/auth/server/auth';
import { ObjectId } from 'mongodb';

function toIdQuery(id: string | undefined | null) {
  if (!id) return id;
  const str = String(id);
  if (ObjectId.isValid(str) && str.length === 24) {
    return { $in: [str, new ObjectId(str)] };
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    return await handleCheck(email);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error checking email';
    return NextResponse.json({ exists: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    return await handleCheck(body.email);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error checking email';
    return NextResponse.json({ exists: false, error: message }, { status: 500 });
  }
}

async function handleCheck(emailRaw: string | undefined | null) {
  const cleanEmail = (emailRaw || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return NextResponse.json({ exists: false, message: 'Valid email required' }, { status: 400 });
  }

  const isTest = process.env.NODE_ENV === 'test';

  if (isTest && testMemoryDb.user?.length) {
    const testUser = testMemoryDb.user.find(
      (u) => String(u.email || '').toLowerCase() === cleanEmail,
    );
    if (testUser) {
      const userId = String(testUser.id || testUser._id);
      const testMember = testMemoryDb.member?.find(
        (m) => String(m.userId) === userId,
      );
      const isEmployee = testMember?.role === 'employee';
      return NextResponse.json({
        exists: true,
        isEmployee,
        role: testMember?.role || 'owner',
        message: 'This email is already registered. You cannot sign up again. Please sign in instead.',
      });
    }
  }

  try {
    const user = await mongoDb.collection('user').findOne({ email: cleanEmail });
    if (user) {
      const userId = user.id ? String(user.id) : String(user._id);
      const member = await mongoDb.collection('member').findOne({
        userId: toIdQuery(userId),
      } as Record<string, unknown>);

      const isEmployee = member?.role === 'employee';
      return NextResponse.json({
        exists: true,
        isEmployee,
        role: member?.role || 'owner',
        message: isEmployee
          ? 'This email has been added as an employee by your company owner. You cannot sign up again. Please sign in instead.'
          : 'This email is already registered. You cannot sign up again. Please sign in instead.',
      });
    }

    const invitation = await mongoDb.collection('invitation').findOne({ email: cleanEmail });
    if (invitation) {
      return NextResponse.json({
        exists: true,
        isEmployee: true,
        role: invitation.role || 'employee',
        message: 'This email has an existing invitation. You cannot sign up again. Please sign in instead.',
      });
    }
  } catch {
    // If Mongo query is unavailable, fallback gracefully
  }

  return NextResponse.json({ exists: false });
}
