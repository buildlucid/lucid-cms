import type { JobDefinition } from "@lucidcms/core/types";

export type SyncJob = JobDefinition<"typesense:sync", { index: string }>;
