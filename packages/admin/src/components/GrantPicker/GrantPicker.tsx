import type { PermissionDetails } from "@types";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Input from "@/components/Input/Input";
import UnavailableGrants from "@/components/UnavailableGrants/UnavailableGrants";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { GrantGroupRow } from "./parts/GrantGroupRow";

export interface GrantGroup {
	key: string;
	details: PermissionDetails;
	grants: Array<{
		key: string;
		details: PermissionDetails;
	}>;
}

type GrantSection = "collections" | "agents" | "general";

const sectionOrder: GrantSection[] = ["collections", "agents", "general"];

//* collection and agent groups are keyed by core as `documents:{key}` and `agents:{key}`
const getSection = (key: string): GrantSection => {
	if (key.startsWith("documents:")) return "collections";
	if (key.startsWith("agents:")) return "agents";
	return "general";
};

/**
 * Picks grants, such as role permissions or integration scopes, from groups
 * that collapse to a summary of what's selected.
 */
const GrantPicker: Component<{
	id: string;
	groups: GrantGroup[];
	value: string[];
	onChange: (_value: string[]) => void;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [getQuery, setQuery] = createSignal("");

	// ----------------------------------------
	// Memos
	const query = createMemo(() => getQuery().trim().toLowerCase());
	const filteredGroups = createMemo(() => {
		if (!query()) return props.groups;

		const matches = (details: PermissionDetails) =>
			helpers
				.getLocaleValue({ value: details.name })
				.toLowerCase()
				.includes(query());

		return props.groups.flatMap((group) => {
			if (matches(group.details)) return [group];
			const grants = group.grants.filter((grant) => matches(grant.details));
			return grants.length > 0 ? [{ ...group, grants }] : [];
		});
	});
	const sections = createMemo(() =>
		sectionOrder
			.map((section) => ({
				key: section,
				groups: filteredGroups().filter(
					(group) => getSection(group.key) === section,
				),
			}))
			.filter((section) => section.groups.length > 0),
	);
	const unavailableKeys = createMemo(() =>
		props.value.filter(
			(key) =>
				!props.groups.some((group) =>
					group.grants.some((grant) => grant.key === key),
				),
		),
	);

	// ----------------------------------------
	// Functions
	const sectionLabel = (section: GrantSection) => {
		if (section === "collections") return T()("common.collections");
		if (section === "agents") return T()("common.agents");
		return T()("common.general");
	};

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-4">
			<Input
				id={`${props.id}-filter`}
				name={`${props.id}-filter`}
				type="search"
				value={getQuery()}
				onChange={setQuery}
				placeholder={T()("access.filter.placeholder")}
				aria-label={T()("common.filter")}
				autocomplete="off"
			/>
			<UnavailableGrants
				keys={unavailableKeys()}
				onRemove={(key) =>
					props.onChange(props.value.filter((value) => value !== key))
				}
				disabled={props.disabled}
			/>
			<For each={sections()}>
				{(section) => (
					<section>
						<h4 class="mb-1.5 text-xs text-muted">
							{sectionLabel(section.key)}
						</h4>
						<ul class="divide-y divide-border rounded-md border border-border bg-card">
							<For each={section.groups}>
								{(group) => (
									<GrantGroupRow
										id={props.id}
										group={group}
										value={props.value}
										onChange={props.onChange}
										forceOpen={query().length > 0}
										disabled={props.disabled}
									/>
								)}
							</For>
						</ul>
					</section>
				)}
			</For>
			<Show when={sections().length === 0}>
				<p class="text-sm text-subtitle">{T()("access.filter.empty")}</p>
			</Show>
		</div>
	);
};

export default GrantPicker;
