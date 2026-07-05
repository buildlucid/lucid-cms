import { copy, translate } from "../../libs/i18n/index.js";
import { LucidError } from "../errors/index.js";

/** Fractional order keys are base-36 strings with room between neighbours. */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

const throwOrderError = (
	key:
		| "server:core.documents.order.fractional.bounds.invalid"
		| "server:core.documents.order.fractional.key.invalid",
	data: Record<string, string>,
): never => {
	throw new LucidError({
		message: translate(copy(key, { data })),
		scope: "fractional-order",
		data,
	});
};

const isValidOrderKey = (key: string): boolean => {
	if (key.length === 0) return false;
	//* trailing zero keys cannot be split below
	if (key.endsWith(DIGITS[0] as string)) return false;
	for (const char of key) {
		if (!DIGITS.includes(char)) return false;
	}
	return true;
};

/** Returns a lexicographic midpoint between two bounds. */
const midpoint = (a: string, b: string | null): string => {
	if (b !== null && a >= b) {
		throwOrderError("server:core.documents.order.fractional.bounds.invalid", {
			lower: a,
			upper: b,
		});
	}

	if (b !== null) {
		//* split after the shared prefix
		let prefixLength = 0;
		while ((a.charAt(prefixLength) || DIGITS[0]) === b.charAt(prefixLength)) {
			prefixLength++;
		}
		if (prefixLength > 0) {
			return (
				b.slice(0, prefixLength) +
				midpoint(a.slice(prefixLength), b.slice(prefixLength))
			);
		}
	}

	const digitA = a ? DIGITS.indexOf(a.charAt(0)) : 0;
	const digitB = b !== null ? DIGITS.indexOf(b.charAt(0)) : DIGITS.length;

	if (digitB - digitA > 1) {
		const midDigit = Math.round(0.5 * (digitA + digitB));
		return DIGITS.charAt(midDigit);
	}

	//* keep the upper prefix when first digits are adjacent
	if (b !== null && b.length > 1) {
		return b.slice(0, 1);
	}

	//* extend the lower bound when no midpoint exists at this depth
	return DIGITS.charAt(digitA) + midpoint(a.slice(1), null);
};

/** Generates an order key between two neighbouring keys. */
export const generateKeyBetween = (
	a: string | null,
	b: string | null,
): string => {
	if (a !== null && !isValidOrderKey(a)) {
		throwOrderError("server:core.documents.order.fractional.key.invalid", {
			key: a,
		});
	}
	if (b !== null && !isValidOrderKey(b)) {
		throwOrderError("server:core.documents.order.fractional.key.invalid", {
			key: b,
		});
	}
	if (a !== null && b !== null && a >= b) {
		throwOrderError("server:core.documents.order.fractional.bounds.invalid", {
			lower: a,
			upper: b,
		});
	}

	return midpoint(a ?? "", b);
};

/** Checks whether a stored order key is usable. */
export const isFractionalOrderKey = (value: unknown): value is string =>
	typeof value === "string" && isValidOrderKey(value);
