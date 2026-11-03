import type { DeployRunStatus } from "@types";
import { type Component, Show } from "solid-js";
import Pill, { type PillSize } from "@/components/Pill/Pill";
import {
	deployRunTones,
	deployTonePills,
	getDeployRunStatusLabel,
} from "@/utils/deploys";

/** A run's status as a pill, with a pulsing dot while the host works on it. */
const DeployRunStatusPill: Component<{
	status: DeployRunStatus;
	size?: PillSize;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Pill
			variant={deployTonePills[deployRunTones[props.status]]}
			size={props.size}
			class="gap-1.5"
		>
			<Show when={deployRunTones[props.status] === "active"}>
				<span
					aria-hidden="true"
					class="size-1.5 rounded-full bg-blue text-blue motion-safe:animate-status-pulse"
				/>
			</Show>
			{getDeployRunStatusLabel(props.status)}
		</Pill>
	);
};

export default DeployRunStatusPill;
