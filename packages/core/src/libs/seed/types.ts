import type { ServiceContext } from "../../utils/services/types.js";

export type Seed = (context: ServiceContext) => Promise<void>;

export type SeedDefinition = { name: string; seed: Seed };
