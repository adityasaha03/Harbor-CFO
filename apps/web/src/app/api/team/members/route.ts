import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerSession } from '@/features/auth/server/session';
import { auth } from '@/features/auth/server/auth';
import { mongoDb } from '@/features/auth/server/mongo';
import type { Role } from '@harbor/contracts';

interface AddMemberBody {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

interface UpdateMemberBody {
  memberId: string;
  name?: string;
  role?: Role;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.session?.activeOrganizationId;
    if (!orgId) {
      return NextResponse.json({ message: 'Active organization required' }, { status: 400 });
    }

    const callerMember = await mongoDb.collection('member').findOne({
      userId: session.user.id,
      organizationId: orgId,
    });
    if (!callerMember || callerMember.role !== 'owner') {
      return NextResponse.json({ message: 'Only company owners can add members' }, { status: 403 });
    }

    const body = (await req.json()) as AddMemberBody;
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanName: string = (body.name || '').trim() || cleanEmail.split('@')[0] || 'Member';
    const role: Role = ['owner', 'employee', 'reviewer'].includes(body.role) ? body.role : 'employee';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }

    const reqHeaders = await headers();
    const existingUser = await mongoDb.collection('user').findOne({ email: cleanEmail });
    let userId: string;

    if (!existingUser) {
      const passwordToUse = body.password?.trim() || 'Password123!';
      const created = await auth.api.signUpEmail({
        headers: reqHeaders,
        body: {
          email: cleanEmail,
          password: passwordToUse,
          name: cleanName,
        },
      });
      userId = created.user.id;
    } else {
      userId = existingUser.id ? String(existingUser.id) : String(existingUser._id);
    }

    const existingMember = await mongoDb.collection('member').findOne({
      $or: [
        { userId, organizationId: orgId },
        { 'userId.id': userId, organizationId: orgId },
      ],
    });

    if (existingMember) {
      await auth.api.updateMemberRole({
        headers: reqHeaders,
        body: {
          memberId: String(existingMember.id || existingMember._id),
          role,
          organizationId: orgId,
        },
      });
    } else {
      await auth.api.addMember({
        headers: reqHeaders,
        body: {
          userId,
          organizationId: orgId,
          role,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Member added successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add member';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.session?.activeOrganizationId;
    if (!orgId) {
      return NextResponse.json({ message: 'Active organization required' }, { status: 400 });
    }

    const callerMember = await mongoDb.collection('member').findOne({
      userId: session.user.id,
      organizationId: orgId,
    });
    if (!callerMember || callerMember.role !== 'owner') {
      return NextResponse.json({ message: 'Only company owners can update members' }, { status: 403 });
    }

    const body = (await req.json()) as UpdateMemberBody;
    const { memberId, name, role } = body;
    if (!memberId) {
      return NextResponse.json({ message: 'Member ID is required' }, { status: 400 });
    }

    const reqHeaders = await headers();

    if (role && ['owner', 'employee', 'reviewer'].includes(role)) {
      await auth.api.updateMemberRole({
        headers: reqHeaders,
        body: {
          memberId,
          role,
          organizationId: orgId,
        },
      });
    }

    if (name?.trim()) {
      const memberDoc = await mongoDb.collection('member').findOne({
        $or: [{ id: memberId }, { _id: memberId as unknown as undefined }],
      } as Record<string, unknown>);
      if (memberDoc?.userId) {
        await mongoDb.collection('user').updateOne(
          { $or: [{ id: memberDoc.userId }, { _id: memberDoc.userId }] } as Record<string, unknown>,
          { $set: { name: name.trim(), updatedAt: new Date() } },
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update member';
    return NextResponse.json({ message }, { status: 500 });
  }
}
