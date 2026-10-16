import { MongoBinary } from "mongodb-memory-server";

export async function setup(): Promise<void> {
  // Pre-download / locate MongoDB binary before parallel test workers are spawned.
  // This eliminates race conditions where multiple workers concurrently download
  // and rename the binary archive in ~/.cache/mongodb-binaries.
  await MongoBinary.getPath();
}
