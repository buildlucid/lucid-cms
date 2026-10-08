import type { Collection, RequestDetail, RequestEvent } from "@types";
import { TbOutlineFilter } from "solid-icons/tb";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import Menu from "@/components/Menu/Menu";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import {
	type RequestActivityFilter,
	requestActivityFilters,
} from "@/utils/requests";
import { RequestCommentThread } from "./RequestCommentThread";
import { RequestEventEntry } from "./RequestEventEntry";

type SystemEvent = Exclude<RequestEvent, { type: "comment" }>;

/**
 * The conversation on a request, newest first. Comment threads, approvals and
 * completing always show. Other activity, eg. content edits, is shown from the
 * filter menu, which is remembered per user.
 */
export const RequestActivity: Component<{
	request: RequestDetail;
	collections: Collection[];
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [shownKeys, setShownKeys] = useUserPreference<string[]>({
		value: () => userPreferencesStore.getRequestActivityFilters(),
		setValue: (value) => userPreferencesStore.setRequestActivityFilters(value),
		defaultValue: [],
	});

	// ----------------------------------------
	// Memos
	const shown = createMemo(() => new Set(shownKeys()));
	const hiddenTypes = createMemo(
		() =>
			new Set<RequestEvent["type"]>(
				requestActivityFilters.flatMap((filter) =>
					shown().has(filter.key) ? [] : filter.types,
				),
			),
	);
	const events = createMemo(() =>
		props.request.events
			.filter((event) => !hiddenTypes().has(event.type))
			.toReversed(),
	);

	// ----------------------------------------
	// Functions
	const toggle = (key: RequestActivityFilter, checked: boolean) => {
		setShownKeys(
			requestActivityFilters
				.map((filter) => filter.key)
				.filter((filterKey) =>
					filterKey === key ? checked : shown().has(filterKey),
				),
		);
	};
	const eventDocument = (event: SystemEvent) =>
		"requestDocumentId" in event
			? props.request.documents.find(
					(document) => document.id === event.requestDocumentId,
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
				title={T()("requests.activity")}
				actions={
					<Menu.Root placement="bottom-end">
						<Menu.Trigger
							class="flex size-7 items-center justify-center rounded-md text-body ring-0 outline-none hover:bg-background-hover focus-visible:ring-1 focus-visible:ring-primary"
							title={T()("requests.activity.filters")}
						>
							<span class="sr-only">{T()("requests.activity.filters")}</span>
							<TbOutlineFilter size={14} />
						</Menu.Trigger>
						<Menu.Content>
							<Menu.Label>{T()("requests.activity.filters")}</Menu.Label>
							<For each={requestActivityFilters}>
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
					{props.request.events.length === 0
						? T()("requests.activity.empty")
						: T()("requests.activity.filtered.empty")}
				</p>
			</Show>
			<ol class="relative before:absolute before:top-4 before:bottom-4 before:left-3.5 before:w-px before:bg-border">
				<For each={events()}>
					{(event) => (
						<Switch>
							<Match when={event.type === "comment" ? event : undefined}>
								{(comment) => (
									<RequestCommentThread
										request={props.request}
										comment={comment()}
									/>
								)}
							</Match>
							<Match when={event.type !== "comment" ? event : undefined}>
								{(event) => (
									<RequestEventEntry
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
