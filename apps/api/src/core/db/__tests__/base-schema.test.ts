import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { createSchema } from '../base-schema';

describe('createSchema base schema factory', () => {
  interface TestDoc {
    name: string;
    amount: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  it('configures timestamps: true by default', () => {
    const schema = createSchema<TestDoc>({
      name: { type: String, required: true },
      amount: { type: Number, required: true },
    });

    expect(schema.get('timestamps')).toBe(true);
    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();
  });

  it('configures versionKey: false by default', () => {
    const schema = createSchema<TestDoc>({
      name: { type: String, required: true },
    });

    expect(schema.get('versionKey')).toBe(false);
  });

  it('transforms _id to string id and removes _id and __v on toJSON', () => {
    const schema = createSchema<TestDoc>({
      name: { type: String, required: true },
      amount: { type: Number, required: true },
    });

    const TestModel = mongoose.model<TestDoc>('BaseSchemaTestJson', schema);
    const doc = new TestModel({ name: 'Invoice A', amount: 5000 });

    const json = doc.toJSON() as unknown as Record<string, unknown>;

    expect(json).toHaveProperty('id');
    expect(typeof json.id).toBe('string');
    expect(json.id).toBe(doc._id.toString());
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
    expect(json.name).toBe('Invoice A');
    expect(json.amount).toBe(5000);
  });

  it('transforms _id to string id and removes _id and __v on toObject', () => {
    const schema = createSchema<TestDoc>({
      name: { type: String, required: true },
      amount: { type: Number, required: true },
    });

    const TestModel = mongoose.model<TestDoc>('BaseSchemaTestObject', schema);
    const doc = new TestModel({ name: 'Invoice B', amount: 10000 });

    const obj = doc.toObject() as unknown as Record<string, unknown>;

    expect(obj).toHaveProperty('id');
    expect(typeof obj.id).toBe('string');
    expect(obj.id).toBe(doc._id.toString());
    expect(obj).not.toHaveProperty('_id');
    expect(obj).not.toHaveProperty('__v');
  });

  it('preserves caller options while applying standard defaults', () => {
    const schema = createSchema<TestDoc>(
      { name: { type: String, required: true } },
      { collection: 'custom_collection_name' },
    );

    expect(schema.get('collection')).toBe('custom_collection_name');
    expect(schema.get('timestamps')).toBe(true);
    expect(schema.get('versionKey')).toBe(false);
  });
});
