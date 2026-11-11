import { createHash } from "node:crypto";
import fc from "fast-check";
import openLucid from "../client/open-lucid.ts";
import loadContext from "../environment/load-context.ts";
import { test } from "../lanes/vitest/test.ts";
import type { JsonValue } from "../utils/json.ts";
import createRandom from "./create-random.ts";
import getRunOptions from "./get-run-options.ts";
import type { SimulationDefinition } from "./types.ts";

const DEFAULT_MAX_ACTIONS = 20;

/**
 * Runs random action sequences against fresh CMS instances, checking invariants after each action.
 * Shrinks failures for seeded replay and records result digests for cross-setup comparisons.
 */
const simulation = <Model>(
	name: string,
	definition: SimulationDefinition<Model>,
): void => {
	test(name, async ({ task }) => {
		const context = loadContext();
		const digest = createHash("sha256");

		const sequences = fc.record({
			steps: fc.array(fc.oneof(...definition.actions), {
				maxLength: definition.maxActions ?? DEFAULT_MAX_ACTIONS,
			}),
			faultSeed: fc.integer({ min: 0 }),
		});

		await fc.assert(
			fc.asyncProperty(sequences, async ({ steps, faultSeed }) => {
				const { adapters } = definition;
				const lucid = await openLucid(context, {
					adapterOverrides:
						adapters && ((cms) => adapters(createRandom(faultSeed), cms)),
					variant: definition.variant,
				});

				try {
					const simulated = {
						model: definition.model(),
						lucid,
						admin: await lucid.admin(),
					};
					const trace: JsonValue[] = [];
					await definition.setup?.(simulated);

					for (const step of steps) {
						if (!step.when(simulated.model)) {
							continue;
						}

						const outcome = await step.run(simulated);
						trace.push({
							action: step.name,
							input: step.input,
							outcome: outcome ?? null,
						});

						for (const [rule, check] of Object.entries(definition.invariants)) {
							await check(simulated).catch((error: unknown) => {
								throw new Error(
									`Invariant broken after ${step.name}: ${rule}`,
									{
										cause: error,
									},
								);
							});
						}
					}

					digest.update(JSON.stringify(trace));
				} finally {
					await lucid.close();
				}
			}),
			getRunOptions(),
		);

		task.meta.harness = {
			seed: context.seed,
			runs: context.simulationRuns,
			digest: digest.digest("hex"),
		};
	});
};

export default simulation;
