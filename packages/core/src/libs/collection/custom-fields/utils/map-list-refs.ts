import type { FieldRef, FieldRefMapper } from "../types.js";

/** Builds a `mapRefs` hook for fields that store a list of IDs from one resource, eg. media. */
const mapListRefs =
	(resource: Exclude<FieldRef["resource"], "documents">) =>
	(value: unknown, map: FieldRefMapper) =>
		Array.isArray(value)
			? value.flatMap((id) =>
					typeof id === "number" ? (map({ resource, id }) ?? []) : [],
				)
			: value;

export default mapListRefs;
