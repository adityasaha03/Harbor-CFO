import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type {
  CreateCommitmentInput,
  UpdateCommitmentInput,
} from '@harbor/contracts';
import { CommitmentModel, type CommitmentDoc } from './commitments.model.js';

export const commitmentsRepository = {
  async findById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<CommitmentDoc | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await CommitmentModel.findOne({ _id: new Types.ObjectId(id), tenantId })
      .session(session ?? null)
      .lean();
    return doc ? (doc as unknown as CommitmentDoc) : null;
  },

  async findByLabel(
    tenantId: string,
    label: string,
    session?: ClientSession,
  ): Promise<CommitmentDoc | null> {
    const doc = await CommitmentModel.findOne({ tenantId, label })
      .session(session ?? null)
      .lean();
    return doc ? (doc as unknown as CommitmentDoc) : null;
  },

  async list(tenantId: string, session?: ClientSession): Promise<CommitmentDoc[]> {
    const docs = await CommitmentModel.find({ tenantId })
      .sort({ anchorOn: 1, _id: 1 })
      .session(session ?? null)
      .lean();
    return docs as unknown as CommitmentDoc[];
  },

  async create(
    tenantId: string,
    data: CreateCommitmentInput,
    session?: ClientSession,
  ): Promise<CommitmentDoc> {
    const [doc] = await CommitmentModel.create(
      [
        {
          tenantId,
          ...data,
        },
      ],
      { session },
    );
    if (!doc) {
      throw new Error('Failed to create commitment');
    }
    return doc.toObject() as CommitmentDoc;
  },

  async update(
    tenantId: string,
    id: string,
    patch: UpdateCommitmentInput,
    session?: ClientSession,
  ): Promise<CommitmentDoc | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await CommitmentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId },
      { $set: patch },
      { new: true, session },
    ).lean();
    return doc ? (doc as unknown as CommitmentDoc) : null;
  },

  async delete(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await CommitmentModel.deleteOne(
      { _id: new Types.ObjectId(id), tenantId },
      { session },
    );
    return result.deletedCount > 0;
  },
};
