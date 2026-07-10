import type z from "zod";

interface RangeSchemaConfig {
	type: string;
	min?: number;
	max?: number;
	step?: number;
	thumbs?: 1 | 2;
	default?: unknown;
}

/** Applies range-only invariants after the shared custom-field shape is parsed. */
export const validateRangeConfig = (
	field: RangeSchemaConfig,
	context: z.RefinementCtx,
) => {
	if (field.type !== "range") return;

	if (field.min === undefined) {
		context.addIssue({
			code: "custom",
			path: ["min"],
			message: "Range min is required",
		});
	}
	if (field.max === undefined) {
		context.addIssue({
			code: "custom",
			path: ["max"],
			message: "Range max is required",
		});
	}
	if (field.step === undefined) {
		context.addIssue({
			code: "custom",
			path: ["step"],
			message: "Range step is required",
		});
	}
	if (
		field.min === undefined ||
		field.max === undefined ||
		field.step === undefined
	) {
		return;
	}
	if (field.max <= field.min) {
		context.addIssue({
			code: "custom",
			path: ["max"],
			message: "Range max must be greater than min",
		});
	}

	const expectedLength = field.thumbs === 2 ? 2 : 1;
	if (
		!Array.isArray(field.default) ||
		field.default.length !== expectedLength
	) {
		context.addIssue({
			code: "custom",
			path: ["default"],
			message: `Range default must contain ${expectedLength} value${expectedLength === 1 ? "" : "s"}`,
		});
		return;
	}

	for (const [index, value] of field.default.entries()) {
		if (
			typeof value !== "number" ||
			!Number.isFinite(value) ||
			value < field.min ||
			value > field.max
		) {
			context.addIssue({
				code: "custom",
				path: ["default", index],
				message: "Range default values must be within min and max",
			});
			continue;
		}

		const steps = (value - field.min) / field.step;
		if (Math.abs(steps - Math.round(steps)) >= 1e-9) {
			context.addIssue({
				code: "custom",
				path: ["default", index],
				message: "Range default values must align to step",
			});
		}
	}
};
