import { FaSolidTriangleExclamation } from "solid-icons/fa";
import type { Component } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";

interface PendingEmailChangeNoticeProps {
	email: string;
	isLoading: boolean;
	onCancel: () => void;
}

const PendingEmailChangeNotice: Component<PendingEmailChangeNoticeProps> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-3 rounded-md border border-warning-base/25 bg-warning-base/5 p-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-start gap-2.5">
				<span class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-warning-base/10 text-warning-base">
					<FaSolidTriangleExclamation size={10} />
				</span>
				<div class="min-w-0">
					<p class="text-sm font-medium text-title">
						{T()("account.email.change.pending.title")}
					</p>
					<p class="mt-0.5 break-words text-xs text-body">
						{T()("account.email.change.pending.description", {
							email: props.email,
						})}
					</p>
				</div>
			</div>
			<Button
				type="button"
				theme="border-outline"
				size="small"
				loading={props.isLoading}
				onClick={props.onCancel}
			>
				{T()("account.email.change.cancel.action")}
			</Button>
		</div>
	);
};

export default PendingEmailChangeNotice;
