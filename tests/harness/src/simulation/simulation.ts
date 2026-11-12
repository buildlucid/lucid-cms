import fc from "fast-check";
import openLucid from "../client/open-lucid.ts";
import loadContext from "../environment/load-context.ts";
import { test } from "../lanes/vitest/test.ts";
import createRandom from "./create-random.ts";
import getRunOptions from "./get-run-options.ts";
import type { SimulationDefinition } from "./types.ts";

const DEFAULT_MAX_ACTIONS = 20;

/**
 * Runs random action sequences against fresh CMS instances, checking invariants after each action.
 * A failure is shrunk to the shortest sequence that still fails, and replays with the seed it
 * prints: `npm run harness -- --lane simulation --seed 42`. `--simulation-runs` sets how many
 * sequences it tries, and the lane gives each a minute before it times out, so a simulation needs
 * no timeout of its own. Move the clock with `advanceClock` rather than waiting, and give anything
 * timed a margin from the steps the clock moves in, so a sequence plays out the same on fast and
 * slow setups. See `suites/simulation/documents/document-lifecycle.test.ts`.
 */
const simulation = <Model>(
	name: string,
	definition: SimulationDefinition<Model>,
): void => {
	test(name, async () => {
		const context = loadContext();

		const sequences = fc.record({
			steps: fc.array(fc.oneof(...definition.actions), {
				maxLength: definition.maxActions ?? DEFAULT_MAX_ACTIONS,
				//* fast-check's default size stops arrays at 10 items, whatever the maximum
				size: "max",
			}),
			faultSeed: fc.integer({ min: 0 }),
		});

		await fc.assert(
			fc.asyncProperty(sequences, async ({ steps, faultSeed }) => {
				const { adapters } = definition;
				const model = definition.model();
				const lucid = await openLucid(context, {
					adapterOverrides:
						adapters &&
						((cms) => adapters(createRandom(faultSeed), cms, model)),
					variant: definition.variant,
				});

				try {
					const simulated = {
						model,
						lucid,
						admin: await lucid.admin(),
					};
					const checkInvariants = async (after: string) => {
						for (const [rule, check] of Object.entries(definition.invariants)) {
							await check(simulated).catch((error: unknown) => {
								throw new Error(`Invariant broken after ${after}: ${rule}`, {
									cause: error,
								});
							});
						}
					};
					await definition.setup?.(simulated);

					for (const step of steps) {
						if (!step.when(simulated.model)) {
							continue;
						}

						await step.run(simulated);
						await checkInvariants(step.name);
					}

					if (definition.settle) {
						await definition.settle(simulated);
						await checkInvariants("settling");
					}
				} finally {
					await lucid.close();
				}
			}),
			getRunOptions(),
		);
	});
};

export default simulation;
