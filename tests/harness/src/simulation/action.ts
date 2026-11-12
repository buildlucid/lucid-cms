import fc from "fast-check";
import type { JsonValue } from "../utils/json.ts";
import type { ActionDefinition, Step } from "./types.ts";

/**
 * Defines an action for a simulation. The result generates steps with an input already chosen,
 * which print as `name(input)` when a failing sequence is reported.
 *
 * @example
 * ```ts
 * const createPage = action<Model, string>({
 * 	name: "createPage",
 * 	input: fc.string({ minLength: 1 }),
 * 	run: async ({ admin, model, input }) => {},
 * });
 * ```
 */
const action = <Model, Input extends JsonValue | undefined = undefined>(
	definition: ActionDefinition<Model, Input>,
): fc.Arbitrary<Step<Model>> => {
	//* an action without input always gets `undefined`, which is the only value its type allows
	const input =
		definition.input ?? (fc.constant(undefined) as fc.Arbitrary<Input>);

	return input.map((value) => ({
		name: definition.name,
		when: definition.when ?? (() => true),
		run: (context) => definition.run({ ...context, input: value }),
		[fc.toStringMethod]: () =>
			`${definition.name}(${value === undefined ? "" : JSON.stringify(value)})`,
	}));
};

export default action;
