import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.DATABASE_URL, {
    dbName: "spas_saeb",
  });
}
