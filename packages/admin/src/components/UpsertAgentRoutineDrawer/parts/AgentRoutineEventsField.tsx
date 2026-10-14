import type { AgentRoutineEventFilter, ErrorResultObj } from "@types";
import { TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, Index, Show } from "solid-js";
import Button from "@/components/Button/Button";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Select from "@/components/Select/Select";
import SelectMultiple, {
	type SelectMultipleOption,
} from "@/components/SelectMultiple/SelectMultiple";
import Switch from "@/components/Switch/Switch";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	maxRoutineEvents,
	mediaTypes,
	offersRoutineFilter,
	type RoutineEventDraft,
	routineEventLabel,
	routineEventNames,
} from "@/utils/agent-routine-events";
import { getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import { requestTypeKeys, requestTypes } from "@/utils/requests";

/** Selects routine content events and their supported filters. */
const AgentRoutineEventsField: Component<{
	value: RoutineEventDraft[];
	onChange: (value: RoutineEventDraft[]) => void;
	/** Validation errors for each event, by position. */
	errors?: ErrorResultObj[];
}> = (props) => {
	// ----------------------------------------
	// Queries
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const eventOptions = createMemo(() =>
		routineEventNames.map((event) => ({
			value: event,
			label: routineEventLabel(event),
		})),
	);
	//* offer collections the current user can read
	const collectionOptions = createMemo(() =>
		(collections.data?.data ?? [])
			.filter(
				(collection) =>
					userStore.get.hasPermission([collection.permissions.read]).all,
			)
			.map((collection) => ({
				value: collection.key,
				label: helpers.getLocaleValue({
					value: collection.details.labels.plural,
					fallback: collection.key,
				}),
			})),
	);
	const requestTypeOptions = createMemo(() =>
		requestTypeKeys.map((type) => ({
			value: type,
			label: requestTypes[type].label(),
		})),
	);
	const mediaTypeOptions = createMemo(() =>
		mediaTypes.map((type) => ({
			value: type,
			label: T()(`media.types.${type}`),
		})),
	);

	// ----------------------------------------
	// Functions
	const update = (index: number, changes: Partial<RoutineEventDraft>) =>
		props.onChange(
			props.value.map((draft, position) =>
				position === index ? { ...draft, ...changes } : draft,
			),
		);
	const setFilter = <Key extends keyof AgentRoutineEventFilter>(
		index: number,
		key: Key,
		value: AgentRoutineEventFilter[Key],
	) => {
		const draft = props.value[index];
		if (draft) update(index, { filter: { ...draft.filter, [key]: value } });
	};
	const selected = (
		options: SelectMultipleOption[],
		values: readonly string[] | undefined,
	) =>
		options.filter((option) => values?.some((value) => value === option.value));
	//* retain unavailable saved collections so editing preserves their filters
	const collectionOptionsFor = (draft: RoutineEventDraft) => [
		...collectionOptions(),
		...(draft.filter.collections ?? [])
			.filter(
				(key) => !collectionOptions().some((option) => option.value === key),
			)
			.map((key) => ({ value: key, label: key })),
	];
	const filterErrors = (index: number) =>
		getErrorObject(props.errors?.[index]?.filter);

	// ----------------------------------------
	// Render
	return (
		<section id="agent-routine-events">
			<SectionHeading
				title={T()("agent.routine.events.title")}
				description={T()("agent.routine.events.description")}
				level={3}
			/>
			<Show when={props.value.length > 0}>
				<ul class="mb-3 flex flex-col gap-2">
					{/* index by position to preserve inputs, focus and menus while editing */}
					<Index each={props.value}>
						{(draft, index) => (
							<li class="group flex items-center gap-3 rounded-md border border-border bg-card p-3">
								<div class="flex min-w-0 grow flex-col gap-3">
									<Select
										id={`routine-event-${index}`}
										name={`events.${index}.event`}
										label={T()("agent.routine.event.label")}
										value={draft().event}
										options={eventOptions()}
										errors={getErrorObject(props.errors?.[index]?.event)}
										onChange={(event) => {
											const match = routineEventNames.find(
												(name) => name === event,
											);
											if (match) update(index, { event: match });
										}}
									/>
									<div class="grid gap-3 md:grid-cols-2 [&>*:only-child]:md:col-span-2">
										<Show
											when={offersRoutineFilter(draft().event, "collections")}
										>
											<SelectMultiple
												id={`routine-event-${index}-collections`}
												name={`events.${index}.filter.collections`}
												label={T()("agent.routine.event.collections")}
												placeholder={T()(
													"agent.routine.event.collections.placeholder",
												)}
												values={selected(
													collectionOptionsFor(draft()),
													draft().filter.collections,
												)}
												options={collectionOptionsFor(draft())}
												errors={getErrorObject(
													filterErrors(index)?.collections,
												)}
												onChange={(values) =>
													setFilter(
														index,
														"collections",
														values.map((option) => String(option.value)),
													)
												}
											/>
										</Show>
										<Show
											when={offersRoutineFilter(draft().event, "requestTypes")}
										>
											<SelectMultiple
												id={`routine-event-${index}-request-types`}
												name={`events.${index}.filter.requestTypes`}
												label={T()("agent.routine.event.request.types")}
												placeholder={T()(
													"agent.routine.event.request.types.placeholder",
												)}
												values={selected(
													requestTypeOptions(),
													draft().filter.requestTypes,
												)}
												options={requestTypeOptions()}
												errors={getErrorObject(
													filterErrors(index)?.requestTypes,
												)}
												onChange={(values) =>
													setFilter(
														index,
														"requestTypes",
														requestTypeKeys.filter((type) =>
															values.some((option) => option.value === type),
														),
													)
												}
											/>
										</Show>
										<Show
											when={offersRoutineFilter(draft().event, "mediaTypes")}
										>
											<SelectMultiple
												id={`routine-event-${index}-media-types`}
												name={`events.${index}.filter.mediaTypes`}
												label={T()("agent.routine.event.media.types")}
												placeholder={T()(
													"agent.routine.event.media.types.placeholder",
												)}
												values={selected(
													mediaTypeOptions(),
													draft().filter.mediaTypes,
												)}
												options={mediaTypeOptions()}
												errors={getErrorObject(filterErrors(index)?.mediaTypes)}
												onChange={(values) =>
													setFilter(
														index,
														"mediaTypes",
														mediaTypes.filter((type) =>
															values.some((option) => option.value === type),
														),
													)
												}
											/>
										</Show>
									</div>
									<Show when={offersRoutineFilter(draft().event, "fields")}>
										<Switch
											id={`routine-event-${index}-file`}
											name={`events.${index}.filter.fields`}
											label={T()("agent.routine.event.file.only")}
											value={draft().filter.fields?.includes("file") ?? false}
											onChange={(value) =>
												setFilter(index, "fields", value ? ["file"] : undefined)
											}
										/>
									</Show>
								</div>
								{/* keep row actions visible for coarse pointers */}
								<Button
									type="button"
									variant="danger-ghost"
									size="xs"
									shape="square"
									class="shrink-0 rounded-full! opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
									title={T()("agent.routine.events.remove")}
									aria-label={T()("agent.routine.events.remove")}
									onClick={() =>
										props.onChange(
											props.value.filter((_, position) => position !== index),
										)
									}
								>
									<TbOutlineX size={12} />
								</Button>
							</li>
						)}
					</Index>
				</ul>
			</Show>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={props.value.length >= maxRoutineEvents}
				onClick={() =>
					props.onChange([
						...props.value,
						{ event: "documents:updated", filter: {} },
					])
				}
			>
				{T()("agent.routine.events.add")}
			</Button>
		</section>
	);
};

export default AgentRoutineEventsField;
