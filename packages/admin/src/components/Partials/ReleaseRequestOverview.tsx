import type {
	PublishOperationExecutionStatus,
	PublishOperationOverview,
	PublishOperationStatus,
} from "@types";
import {
	FaSolidCheck,
	FaSolidClock,
	FaSolidLayerGroup,
	FaSolidUserCheck,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, For, type JSXElement } from "solid-js";
import type { FilterValue, QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";
import ReleaseRequestOverviewTile from "./ReleaseRequestOverviewTile";

type ReleaseRequestPreset = {
	key: string;
	label: string;
	value: number | undefined;
	icon: JSXElement;
	tone: "grey" | "blue" | "green" | "purple" | "red" | "yellow";
	filters: {
		status?: PublishOperationStatus;
		executionStatus?: PublishOperationExecutionStatus;
		assignedToMe?: boolean;
		requestedByMe?: boolean;
	};
};

const presetFilterValue = (value: FilterValue): FilterValue => {
	if (Array.isArray(value)) return value.length === 1 ? value[0] : undefined;
	return value === "" ? undefined : value;
};

const ReleaseRequestOverview: Component<{
	overview?: PublishOperationOverview;
	loading: boolean;
	searchParams: QueryStateResponse;
}> = (props) => {
	// ----------------------------------
	// Memos
	const presets = createMemo<ReleaseRequestPreset[]>(() => [
		{
			key: "total",
			label: T()("common.all.requests"),
			value: props.overview?.total,
			icon: <FaSolidLayerGroup size={14} />,
			tone: "grey",
			filters: {},
		},
		{
			key: "pending",
			label: T()("common.pending.review"),
			value: props.overview?.pending,
			icon: <FaSolidClock size={14} />,
			tone: "yellow",
			filters: {
				status: "pending",
			},
		},
		{
			key: "assigned",
			label: T()("common.assigned.to.me"),
			value: props.overview?.assignedToMe,
			icon: <FaSolidUserCheck size={14} />,
			tone: "blue",
			filters: {
				assignedToMe: true,
			},
		},
		{
			key: "approved",
			label: T()("common.status.approved"),
			value: props.overview?.approved,
			icon: <FaSolidCheck size={14} />,
			tone: "green",
			filters: {
				status: "approved",
			},
		},
		{
			key: "rejected",
			label: T()("common.status.rejected"),
			value: props.overview?.rejected,
			icon: <FaSolidXmark size={14} />,
			tone: "red",
			filters: {
				status: "rejected",
			},
		},
	]);

	// ----------------------------------
	// Functions
	const isActive = (preset: ReleaseRequestPreset) => {
		const filters = props.searchParams.filters();
		const currentStatus = presetFilterValue(filters.get("status"));
		const currentExecutionStatus = presetFilterValue(
			filters.get("executionStatus"),
		);
		const currentAssignedToMe = presetFilterValue(filters.get("assignedToMe"));
		const currentRequestedByMe = presetFilterValue(
			filters.get("requestedByMe"),
		);

		return (
			currentStatus === preset.filters.status &&
			currentExecutionStatus === preset.filters.executionStatus &&
			currentAssignedToMe === preset.filters.assignedToMe &&
			currentRequestedByMe === preset.filters.requestedByMe
		);
	};
	const applyPreset = (preset: ReleaseRequestPreset) => {
		props.searchParams.setParams({
			filters: {
				status: preset.filters.status,
				executionStatus: preset.filters.executionStatus,
				assignedToMe: preset.filters.assignedToMe,
				requestedByMe: preset.filters.requestedByMe,
			},
			pagination: {
				page: 1,
			},
		});
	};

	// ----------------------------------
	// Render
	return (
		<div class="grid grid-cols-1 gap-3 px-4 pt-4 md:grid-cols-2 md:px-6 lg:grid-cols-5">
			<For each={presets()}>
				{(preset) => (
					<ReleaseRequestOverviewTile
						icon={preset.icon}
						label={preset.label}
						value={preset.value}
						tone={preset.tone}
						active={isActive(preset)}
						loading={props.loading}
						onClick={() => applyPreset(preset)}
					/>
				)}
			</For>
		</div>
	);
};

export default ReleaseRequestOverview;
