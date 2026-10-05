import type { Collection, Release, ReleaseEvent } from "@types";
import { FaSolidFilter } from "solid-icons/fa";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import Menu from "@/components/Menu/Menu";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import {
	type ReleaseActivityFilter,
	releaseActivityFilters,
} from "@/utils/releases";
import { ReleaseCommentEntry } from "./ReleaseCommentEntry";
import { ReleaseEventEntry } from "./ReleaseEventEntry";

type SystemEvent = Exclude<ReleaseEvent, { type: "comment" }>;

/**
 * The conversation on a release, newest first. Comments, approvals and
 * releasing always show. Other activity, eg. content edits, is shown from the
 * filter menu, which is remembered per user.
 */
export const ReleaseActivity: Component<{
	release: Release;
	collections: Collection[];
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [shownKeys, setShownKeys] = useUserPreference<string[]>({
		value: () => userPreferencesStore.getReleaseActivityFilters(),
		setValue: (value) => userPreferencesStore.setReleaseActivityFilters(value),
		defaultValue: [],
	});

	// ----------------------------------------
	// Memos
	const shown = createMemo(() => new Set(shownKeys()));
	const hiddenTypes = createMemo(
		() =>
			new Set<ReleaseEvent["type"]>(
				releaseActivityFilters.flatMap((filter) =>
					shown().has(filter.key) ? [] : filter.types,
				),
			),
	);
	const events = createMemo(() =>
		props.release.events
			.filter((event) => !hiddenTypes().has(event.type))
			.toReversed(),
	);

	// ----------------------------------------
	// Functions
	const toggle = (key: ReleaseActivityFilter, checked: boolean) => {
		setShownKeys(
			releaseActivityFilters
				.map((filter) => filter.key)
				.filter((filterKey) =>
					filterKey === key ? checked : shown().has(filterKey),
				),
		);
	};
	const eventDocument = (event: SystemEvent) =>
		"releaseDocumentId" in event
			? props.release.documents.find(
					(document) => document.id === event.releaseDocumentId,
				)
			: undefined;
	const eventCollection = (event: SystemEvent) => {
		const key =
			"collectionKey" in event
				? event.collectionKey
				: eventDocument(event)?.collectionKey;
		return props.collections.find((collection) => collection.key === key);
	};

	// ----------------------------------------
	// Render
	return (
		<section>
			<SectionHeading
				title={T()("releases.activity")}
				actions={
					<Menu.Root placement="bottom-end">
						<Menu.Trigger
							class="flex size-7 items-center justify-center rounded-md text-body ring-0 outline-none hover:bg-background-hover focus-visible:ring-1 focus-visible:ring-primary"
							title={T()("releases.activity.filters")}
						>
							<span class="sr-only">{T()("releases.activity.filters")}</span>
							<FaSolidFilter size={12} />
						</Menu.Trigger>
						<Menu.Content>
							<For each={releaseActivityFilters}>
								{(filter) => (
									<Menu.CheckboxItem
										checked={shown().has(filter.key)}
										onChange={(checked) => toggle(filter.key, checked)}
										textValue={T()(filter.label)}
									>
										{T()(filter.label)}
									</Menu.CheckboxItem>
								)}
							</For>
						</Menu.Content>
					</Menu.Root>
				}
			/>
			<Show when={events().length === 0}>
				<p class="text-sm text-muted">
					{props.release.events.length === 0
						? T()("releases.activity.empty")
						: T()("releases.activity.filtered.empty")}
				</p>
			</Show>
			<ol class="relative before:absolute before:top-4 before:bottom-4 before:left-3.5 before:w-px before:bg-border">
				<For each={events()}>
					{(event) => (
						<Switch>
							<Match when={event.type === "comment" ? event : undefined}>
								{(comment) => (
									<ReleaseCommentEntry
										release={props.release}
										comment={comment()}
									/>
								)}
							</Match>
							<Match when={event.type !== "comment" ? event : undefined}>
								{(event) => (
									<ReleaseEventEntry
										event={event()}
										collection={eventCollection(event())}
										documentId={eventDocument(event())?.documentId}
									/>
								)}
							</Match>
						</Switch>
					)}
				</For>
			</ol>
		</section>
	);
};
