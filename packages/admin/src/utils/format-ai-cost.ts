import type { AiGenerateCost } from "@types";
import T from "@/translations";

const creditPattern = /^(0|[1-9]\d*)(\.\d+)?$/;

const normalizeCredits = (value: string) => {
	if (!creditPattern.test(value)) return undefined;
	const [whole, fraction = ""] = value.split(".");
	return { whole, fraction };
};

/** Adds authoritative decimal credit strings without floating-point drift. */
export const sumAiCredits = (costs: AiGenerateCost[]): AiGenerateCost => {
	const parsed = costs
		.map((cost) => normalizeCredits(cost.creditsCharged))
		.filter((value): value is NonNullable<typeof value> => value !== undefined);
	const scale = Math.max(0, ...parsed.map((value) => value.fraction.length));
	const total = parsed.reduce(
		(sum, value) =>
			sum + BigInt(`${value.whole}${value.fraction.padEnd(scale, "0") || ""}`),
		0n,
	);
	const padded = total.toString().padStart(scale + 1, "0");
	const result =
		scale === 0
			? padded
			: `${padded.slice(0, -scale)}.${padded.slice(-scale)}`.replace(
					/\.?0+$/,
					"",
				);
	return { creditsCharged: result || "0" };
};

const formatAiCost = (cost?: AiGenerateCost): string | undefined => {
	if (!cost) return undefined;
	const parsed = normalizeCredits(cost.creditsCharged);
	if (!parsed) return undefined;
	const value = new Intl.NumberFormat(undefined, {
		maximumFractionDigits: Math.max(2, Math.min(parsed.fraction.length, 6)),
	}).format(Number(cost.creditsCharged));
	return T()("ai.usage.credits.value", { value });
};

export default formatAiCost;
