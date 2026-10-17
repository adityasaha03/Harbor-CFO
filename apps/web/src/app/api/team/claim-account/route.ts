import { NextResponse } from 'next/server';
import { mongoDb } from '@/features/auth/server/mongo';
import { ObjectId } from 'mongodb';

interface ClaimAccountBody {
  name?: string;
  email: string;
  password: string;
}

function toIdQuery(id: string | undefined | null) {
  if (!id) return id;
  const str = String(id);
  if (ObjectId.isValid(str) && str.length === 24) {
    return { $in: [str, new ObjectId(str)] };
  }
  return str;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClaimAccountBody;
    const cleanEmail = body.email?.trim().toLowerCase();
    const cleanPassword = body.password?.trim();

    if (!cleanEmail || !cleanPassword || cleanPassword.length < 8) {
      return NextResponse.json({ message: 'Valid email and password (min 8 chars) required' }, { status: 400 });
    }

    const user = await mongoDb.collection('user').findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = user.id ? String(user.id) : String(user._id);

    // Verify user is a member of an organization
    const member = await mongoDb.collection('member').findOne({
      userId: toIdQuery(userId),
    } as Record<string, unknown>);
    if (!member) {
      return NextResponse.json({ message: 'User is not associated with any organization' }, { status: 403 });
    }

    // Hash the new password and update account
    const { hashPassword } = await import('better-auth/crypto');
    const hashedPassword = await hashPassword(cleanPassword);

    await mongoDb.collection('account').updateOne(
      { userId: toIdQuery(userId), providerId: 'credential' } as Record<string, unknown>,
      { $set: { password: hashedPassword, updatedAt: new Date() } },
    );

    if (body.name?.trim()) {
      await mongoDb.collection('user').updateOne(
        { _id: user._id },
        { $set: { name: body.name.trim(), updatedAt: new Date() } },
      );
    }

    return NextResponse.json({ success: true, message: 'Account activated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to activate account';
    return NextResponse.json({ message }, { status: 500 });
  }
}
