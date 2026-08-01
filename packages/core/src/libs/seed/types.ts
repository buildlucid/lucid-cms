import type { ServiceContext } from "../../utils/services/types.js";

export type Seed = (context: ServiceContext) => Promise<void>;

export type SeedSource = string | URL | { name: string; seed: Seed };
