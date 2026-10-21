import { isSafe } from "@lucidkiln/core";
import isRecord from "../utils/is-record.js";
import type { UiClient } from "./types.js";

const LOADS: readonly UiClient[] = ["load", "idle", "visible", "only"];

/** Reads a UI component's `client` prop, or null when it renders on the server only. */
export const readClient = (name: string, value: unknown): UiClient | null => {
	if (value === undefined || value === null) return null;
	const load = LOADS.find((option) => option === value);
	if (load) return load;
	if (isRecord(value) && typeof value.media === "string") {
		return { media: value.media };
	}
	throw new Error(
		`The client prop of "${name}" must be "load", "idle", "visible", "only" or { media: "…" }, but got ${JSON.stringify(value)}.`,
	);
};

/** A prop as JSON for the browser. Markup from templates becomes its HTML, and anything JSON can't hold fails. */
const toJson = (name: string, value: unknown, path: string): unknown => {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean" ||
		(typeof value === "number" && Number.isFinite(value))
	) {
		return value;
	}
	if (isSafe(value)) return value.value;
	if (Array.isArray(value)) {
		return value.map((item, index) => toJson(name, item, `${path}[${index}]`));
	}
	if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				toJson(name, item, `${path}.${key}`),
			]),
		);
	}
	const kind =
		value === undefined
			? "undefined"
			: typeof value === "object"
				? (value.constructor?.name ?? "object")
				: typeof value;
	throw new Error(
		`Prop "${path}" of "${name}" can't be sent to the browser, because a ${kind} isn't JSON. Pass plain data, or leave out client to render it on the server only.`,
	);
};

/** A hydrated component's props as a JSON string, naming the prop that JSON can't hold. */
export const propsJson = (name: string, props: Record<string, unknown>) =>
	JSON.stringify(
		Object.fromEntries(
			Object.entries(props).map(([key, value]) => [
				key,
				toJson(name, value, key),
			]),
		),
	);
