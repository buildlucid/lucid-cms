import type { SetupDefinition } from "./types.ts";

/** Describes the `lucid.config.ts` beside a `setup.ts`, so the harness knows how to run it. */
const defineSetup = (definition: SetupDefinition): SetupDefinition =>
	definition;

export default defineSetup;
