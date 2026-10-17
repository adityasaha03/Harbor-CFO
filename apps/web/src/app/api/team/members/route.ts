import { NextResponse } from 'next/server';
import { getServerSession } from '@/features/auth/server/session';
import { auth } from '@/features/auth/server/auth';
import { mongoDb } from '@/features/auth/server/mongo';
import { ObjectId } from 'mongodb';
import type { Role } from '@harbor/contracts';

interface AddMemberBody {
  name: string;
  email: string;
  role: Role;
  password?: string;
  organizationId?: string;
}

interface UpdateMemberBody {
  memberId: string;
  name?: string;
  role?: Role;
  organizationId?: string;
}

function toIdQuery(id: string | undefined | null) {
  if (!id) return id;
  const str = String(id);
  if (ObjectId.isValid(str) && str.length === 24) {
    return { $in: [str, new ObjectId(str)] };
  }
  return str;
}

function toDbId(id: string | undefined | null) {
  if (!id) return id;
  const str = String(id);
  if (ObjectId.isValid(str) && str.length === 24) {
    return new ObjectId(str);
  }
  return str;
}

async function verifyOwnerAccess(userId: string, requestedOrgId?: string) {
  let orgId = requestedOrgId;

  // 1. If orgId is provided, check if user is owner of that org in member collection
  if (orgId) {
    const directMember = await mongoDb.collection('member').findOne({
      userId: toIdQuery(userId),
      organizationId: toIdQuery(orgId),
    } as Record<string, unknown>);
    if (directMember && directMember.role === 'owner') {
      return { isOwner: true, orgId };
    }
  }

  // 2. Check if user is an owner of ANY organization in member collection
  const anyOwnerMember = await mongoDb.collection('member').findOne({
    userId: toIdQuery(userId),
    role: 'owner',
  } as Record<string, unknown>);
  if (anyOwnerMember && anyOwnerMember.organizationId) {
    return { isOwner: true, orgId: orgId || String(anyOwnerMember.organizationId) };
  }

  // 3. Check organization collection in case user is the creator
  if (orgId) {
    const orgDoc = await mongoDb.collection('organization').findOne({
      $or: [
        { _id: toIdQuery(orgId) },
        { id: orgId },
      ] as Record<string, unknown>[],
    });
    if (orgDoc && (String(orgDoc.userId) === userId || String(orgDoc.ownerId) === userId)) {
      return { isOwner: true, orgId };
    }
  }

  return { isOwner: false, orgId: orgId || '' };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as AddMemberBody;
    const requestedOrgId = body.organizationId || session.session?.activeOrganizationId || undefined;

    const { isOwner, orgId } = await verifyOwnerAccess(session.user.id, requestedOrgId);
    if (!isOwner || !orgId) {
      return NextResponse.json({ message: 'Only company owners can add members' }, { status: 403 });
    }

    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanName = (body.name || '').trim() || cleanEmail.split('@')[0] || 'Member';
    const role: Role = ['owner', 'employee', 'reviewer'].includes(body.role) ? body.role : 'employee';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }

    let existingUser = await mongoDb.collection('user').findOne({ email: cleanEmail });
    let newUserId: string;

    if (!existingUser) {
      const passwordToUse = body.password?.trim() || 'Password123!';
      try {
        const created = await auth.api.signUpEmail({
          body: {
            email: cleanEmail,
            password: passwordToUse,
            name: cleanName,
          },
        });
        newUserId = created.user.id;
      } catch {
        const { hashPassword } = await import('better-auth/crypto');
        const hashedPassword = await hashPassword(passwordToUse);
        const newObjId = new ObjectId();
        newUserId = newObjId.toString();

        await mongoDb.collection('user').insertOne({
          _id: newObjId,
          name: cleanName,
          email: cleanEmail,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Record<string, unknown>);

        await mongoDb.collection('account').insertOne({
          _id: new ObjectId(),
          userId: newObjId,
          accountId: cleanEmail,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Record<string, unknown>);
      }
    } else {
      newUserId = String(existingUser.id || existingUser._id);
    }

    const existingMember = await mongoDb.collection('member').findOne({
      userId: toIdQuery(newUserId),
      organizationId: toIdQuery(orgId),
    } as Record<string, unknown>);

    if (existingMember) {
      await mongoDb.collection('member').updateOne(
        { _id: existingMember._id },
        { $set: { role, updatedAt: new Date() } },
      );
    } else {
      const memberId = new ObjectId();
      await mongoDb.collection('member').insertOne({
        _id: memberId,
        organizationId: toDbId(orgId),
        userId: toDbId(newUserId),
        role,
        createdAt: new Date(),
      } as Record<string, unknown>);
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

    const body = (await req.json()) as UpdateMemberBody;
    const requestedOrgId = body.organizationId || session.session?.activeOrganizationId || undefined;

    const { isOwner } = await verifyOwnerAccess(session.user.id, requestedOrgId);
    if (!isOwner) {
      return NextResponse.json({ message: 'Only company owners can update members' }, { status: 403 });
    }

    const { memberId, name, role } = body;
    if (!memberId) {
      return NextResponse.json({ message: 'Member ID is required' }, { status: 400 });
    }

    if (role && ['owner', 'employee', 'reviewer'].includes(role)) {
      await mongoDb.collection('member').updateOne(
        { _id: toIdQuery(memberId) } as Record<string, unknown>,
        { $set: { role, updatedAt: new Date() } },
      );
    }

    if (name?.trim()) {
      const memberDoc = await mongoDb.collection('member').findOne({
        _id: toIdQuery(memberId),
      } as Record<string, unknown>);
      if (memberDoc?.userId) {
        await mongoDb.collection('user').updateOne(
          { _id: toIdQuery(String(memberDoc.userId)) } as Record<string, unknown>,
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
