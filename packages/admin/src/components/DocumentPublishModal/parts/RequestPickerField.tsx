import type { RequestSummary } from "@types";
import { TbOutlinePencil, TbOutlineX } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import T from "@/translations";
import { getRequestState, requestStates } from "@/utils/requests";

export const RequestPickerField: Component<{
	request: RequestSummary | undefined;
	onOpen: () => void;
	onClear: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="w-full">
			<FormLabel
				id="existing-request"
				label={T()("requests.mode.existing.select")}
				theme="basic"
			/>
			<Show
				when={props.request}
				fallback={
					<Button
						id="existing-request"
						type="button"
						variant="outline"
						size="md"
						onClick={props.onOpen}
					>
						{T()("requests.select.action")}
					</Button>
				}
			>
				{(request) => (
					<div class="group w-full border border-border rounded-md bg-input px-3 py-2">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<span class="text-sm font-medium text-subtitle truncate block">
									{request().title}
								</span>
								<p class="text-xs text-muted truncate">
									{T()("requests.documents.count", {
										count: request().documents.length,
									})}
									{" · "}
									{requestStates[getRequestState(request())].label()}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
								<Button
									id="existing-request"
									type="button"
									variant="ghost"
									size="xs"
									shape="square"
									onClick={props.onOpen}
								>
									<TbOutlinePencil size={12} />
									<span class="sr-only">{T()("common.edit")}</span>
								</Button>
								<Button
									type="button"
									variant="danger-ghost"
									size="xs"
									shape="square"
									onClick={props.onClear}
								>
									<TbOutlineX size={14} />
									<span class="sr-only">{T()("common.clear")}</span>
								</Button>
							</div>
						</div>
					</div>
				)}
			</Show>
		</div>
	);
};
