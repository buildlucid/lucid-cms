import { TbOutlineAlertTriangle } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import AgentReferenceRemoveButton from "@/components/AgentReferenceRemoveButton/AgentReferenceRemoveButton";
import T from "@/translations";
import type { AgentUpload } from "@/utils/agent-references";

const AgentUploadFile: Component<{
	upload: AgentUpload;
	onRemove: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class="group relative w-24 rounded-lg border bg-card p-1 shadow-sm"
			classList={{
				"border-border": props.upload.error === undefined,
				"border-danger-low-border": props.upload.error !== undefined,
			}}
			title={props.upload.error ?? props.upload.name}
		>
			<span class="flex h-14 items-center justify-center rounded-md bg-input px-3">
				<Show
					when={props.upload.error === undefined}
					fallback={
						<span
							class="text-danger"
							role="img"
							aria-label={props.upload.error}
						>
							<TbOutlineAlertTriangle size={14} />
						</span>
					}
				>
					<span
						class="block h-1 w-full overflow-hidden rounded-full bg-border"
						role="progressbar"
						aria-label={T()("agent.uploads.progress", {
							name: props.upload.name,
						})}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(props.upload.progress)}
					>
						<span
							class="block h-full rounded-full bg-primary transition-[width]"
							style={{ width: `${props.upload.progress}%` }}
						/>
					</span>
				</Show>
			</span>
			<span class="block truncate px-0.5 pt-1 text-[11px] text-title">
				{props.upload.name}
			</span>
			<AgentReferenceRemoveButton
				label={T()(
					props.upload.error === undefined
						? "agent.uploads.cancel"
						: "agent.uploads.dismiss",
					{ name: props.upload.name },
				)}
				class="inset-s-1.5 top-1.5"
				onRemove={props.onRemove}
			/>
		</div>
	);
};

export default AgentUploadFile;
