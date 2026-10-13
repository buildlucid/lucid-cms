import type {
	AgentInteraction,
	AgentMessagePart,
	AgentWidgetPart,
} from "@types";
import { TbOutlineShieldHalf } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import AgentTranscriptRow from "@/components/AgentTranscriptRow/AgentTranscriptRow";
import { layoutOf } from "@/components/AgentWidget/slots";
import AgentWidgetRow from "@/components/AgentWidgetRow/AgentWidgetRow";
import T, { translateAdminCopy } from "@/translations";
import { type AgentPartGroup, confirmationWidget } from "@/utils/agent-tools";

type ConfirmationRow = AgentWidgetPart & { interaction: AgentInteraction };

/** Matches individual tool confirmations rendered as transcript rows. */
export const isConfirmationRow = (
	part: AgentMessagePart,
): part is ConfirmationRow =>
	part.type === "widget" &&
	part.key === confirmationWidget &&
	part.interaction !== undefined &&
	layoutOf(part) === "row";

const statusCopy = {
	answered: "agent.confirmation.group.confirmed",
	cancelled: "agent.confirmation.group.denied",
	dismissed: "agent.confirmation.group.dismissed",
	pending: "agent.confirmation.group.pending",
} as const satisfies Record<AgentInteraction["status"], string>;

/** Shows consecutive confirmations as one row that expands to list them. */
const AgentConfirmationGroup: Component<{
	group: AgentPartGroup<ConfirmationRow>;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const counts = createMemo(() =>
		Object.entries(statusCopy).flatMap(([status, key]) => {
			const count = props.group.parts.filter(
				(part) => part.interaction.status === status,
			).length;
			return count ? [{ status, label: T()(key, { count }) }] : [];
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.group.parts.length > 1}
			fallback={<AgentWidgetRow widget={props.group.latest} />}
		>
			<AgentTranscriptRow
				icon={<TbOutlineShieldHalf size={10} />}
				label={
					<>
						{translateAdminCopy(props.group.latest.interaction.title)}
						<For each={counts()}>
							{(count) => (
								<span
									classList={{ "text-primary": count.status === "pending" }}
								>
									{" "}
									· {count.label}
								</span>
							)}
						</For>
					</>
				}
			>
				<div class="flex flex-col">
					<For each={props.group.parts}>
						{(widget) => <AgentWidgetRow widget={widget} />}
					</For>
				</div>
			</AgentTranscriptRow>
		</Show>
	);
};

export default AgentConfirmationGroup;
