import type { RefResource, Refs } from "../../exports/types.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";

/** Resources custom fields can reference. Agents are only referenced by document metadata. */
export type FieldRefResource = Exclude<RefResource, "agents">;

export type RefTarget = {
	resource: RefResource;
	table: string;
	value: unknown;
};

export type RefResourceTargets = Map<string, Set<unknown>>;

export type RefTargets = Partial<Record<RefResource, RefResourceTargets>>;

/** `null` omits response refs, `all` exposes every collected resource. */
export type RefResourceSelection = "all" | RefResource[] | null;

type ResolvedRefResource<TResource extends RefResource> = Required<
	Pick<Refs, TResource>
>;

export type RefResourceDefinition<TResource extends RefResource, TInput> = {
	resource: TResource;
	resolve: ServiceFn<[TInput], ResolvedRefResource<TResource>>;
};

export type RefResolvers = {
	[TResource in RefResource]: (
		targets: RefResourceTargets,
	) => ServiceResponse<ResolvedRefResource<TResource>>;
};
