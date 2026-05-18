import type { PublishOperation } from "@types";
import classNames from "classnames";
import { type Component, Show } from "solid-js";
import { Td } from "@/components/Groups/Table";
import T from "@/translations";

const ReleaseRequestTitleCol: Component<{
	request: PublishOperation;
	collectionLabel: string;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
			}}
		>
			<div class="min-w-0">
				<div class="flex min-w-0 items-center gap-2">
					<span
						class={classNames("size-2.5 shrink-0 rounded-full border", {
							"border-primary-muted-border bg-primary-muted-bg":
								!props.request.isOutdated,
							"border-warning-base/60 bg-warning-base/40":
								props.request.isOutdated,
						})}
						title={
							props.request.isOutdated
								? T()("snapshot_outdated")
								: T()("in_sync")
						}
					/>
					<span class="truncate text-sm font-normal text-title">
						{props.request.documentLabel ||
							`${props.collectionLabel} #${props.request.documentId}`}
					</span>
				</div>
				<div class="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-body">
					<Show when={props.request.documentLabel}>
						<span class="truncate">
							{props.collectionLabel} #{props.request.documentId}
						</span>
					</Show>
					<Show when={props.request.documentLabel}>
						<span class="text-border">/</span>
					</Show>
					<span class="truncate text-xs text-body">
						{T()("release_request")} #{props.request.id}
					</span>
					<span class="text-border">/</span>
					<span class="rounded border border-border bg-input-base px-1.5 py-0.5 text-[11px] leading-none text-body">
						{props.request.target}
					</span>
				</div>
			</div>
		</Td>
	);
};

export default ReleaseRequestTitleCol;
