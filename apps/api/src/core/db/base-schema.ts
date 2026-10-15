import { Schema, type SchemaDefinition, type SchemaOptions } from 'mongoose';

/**
 * Standard schema factory for all HarborCFO models.
 * Automatically configures:
 * - timestamps: true (createdAt, updatedAt)
 * - versionKey: false (removes __v)
 * - toJSON & toObject transform: maps _id -> string id and removes _id and __v
 */
export function createSchema<T = Record<string, unknown>>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions,
): Schema<T> {
  const schema = new Schema(definition as SchemaDefinition, {
    timestamps: true,
    versionKey: false,
    ...options,
  });

  const transform = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
    if (ret._id !== undefined && ret._id !== null) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  };

  schema.options.toJSON = {
    virtuals: true,
    transform,
    ...(typeof options?.toJSON === 'object' ? options.toJSON : {}),
  };

  schema.options.toObject = {
    virtuals: true,
    transform,
    ...(typeof options?.toObject === 'object' ? options.toObject : {}),
  };

  return schema as unknown as Schema<T>;
}
