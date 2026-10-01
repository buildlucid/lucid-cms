import type { Media } from "@types";
import classnames from "classnames";
import {
	FaSolidCheck,
	FaSolidCircleInfo,
	FaSolidDownload,
	FaSolidLink,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import { createCopy } from "@/components/Copy/copyValue";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { mediaLabel, previewButtonClass } from "../helpers";

const buttonClass = classnames(
	previewButtonClass,
	"border-border bg-card text-title disabled:opacity-50",
);

/**
 * Copy link, download and details buttons for a previewed media item. Private
 * links only open for people signed in to Lucid with access, so their label
 * says so. Download and details need media read permission, as in the library.
 */
const AgentPreviewActions: Component<{
	media: Media;
	onDetails?: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const requestDownload = api.media.useRequestDownload();
	const [copied, copy] = createCopy(() => props.media.url);

	// ----------------------------------------
	// Memos
	const name = createMemo(() => mediaLabel(props.media));
	const canRead = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaRead]).all,
	);
	const copyLabel = createMemo(() =>
		T()(
			props.media.public
				? "agent.preview.copy.link"
				: "agent.preview.copy.link.private",
			{ name: name() },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<div class={classnames("flex items-center gap-1", props.class)}>
			<button
				type="button"
				class={buttonClass}
				aria-label={copyLabel()}
				title={copyLabel()}
				onClick={() => void copy()}
			>
				<Show when={copied()} fallback={<FaSolidLink size={10} />}>
					<FaSolidCheck size={10} />
				</Show>
			</button>
			<Show when={canRead()}>
				<button
					type="button"
					class={buttonClass}
					aria-label={T()("agent.preview.download", { name: name() })}
					title={T()("agent.preview.download", { name: name() })}
					disabled={requestDownload.action.isPending}
					onClick={() => requestDownload.action.mutate({ id: props.media.id })}
				>
					<FaSolidDownload size={10} />
				</button>
				<Show when={props.onDetails}>
					{(onDetails) => (
						<button
							type="button"
							class={buttonClass}
							aria-label={T()("agent.preview.details", { name: name() })}
							title={T()("agent.preview.details", { name: name() })}
							onClick={() => onDetails()()}
						>
							<FaSolidCircleInfo size={10} />
						</button>
					)}
				</Show>
			</Show>
		</div>
	);
};

export default AgentPreviewActions;
