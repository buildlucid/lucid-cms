import type { TwoFactorSetup } from "@types";
import {
	TbOutlineAlertTriangle,
	TbOutlineCheck,
	TbOutlineCopy,
	TbOutlineExternalLink,
} from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { createCopy } from "@/components/Copy/copyValue";
import TwoFactorQRCode from "@/components/TwoFactorQRCode/TwoFactorQRCode";
import T from "@/translations";

interface TwoFactorSetupPanelProps {
	/** The new secret, or undefined while it's being created. */
	setup: TwoFactorSetup | undefined;
	/** Shows a retry instead of the QR code when creating the secret failed. */
	failed?: boolean;
	onRetry?: () => void;
}

/** Offers a QR code, manual key and app link for authenticator setup. */
const TwoFactorSetupPanel: Component<TwoFactorSetupPanelProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [copied, copy] = createCopy(() => props.setup?.secret ?? "");

	// ----------------------------------------
	// Memos
	const groupedSecret = createMemo(
		() => props.setup?.secret.match(/.{1,4}/g)?.join(" ") ?? "",
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={!props.failed}
			fallback={
				<div class="flex flex-col items-center gap-3 rounded-lg border border-border bg-input px-4 py-8 text-center">
					<TbOutlineAlertTriangle class="size-6 text-warning" />
					<p class="max-w-xs text-sm">{T()("auth.two.factor.setup.failed")}</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => props.onRetry?.()}
					>
						{T()("common.try.again")}
					</Button>
				</div>
			}
		>
			<div class="flex flex-col items-center gap-5 rounded-lg border border-border bg-input p-4 sm:flex-row sm:items-start">
				<div class="size-40 shrink-0">
					<Show
						when={props.setup}
						fallback={<span class="skeleton block size-full rounded-md" />}
					>
						{(setup) => <TwoFactorQRCode uri={setup().uri} />}
					</Show>
				</div>
				<div class="min-w-0 flex-1 text-center sm:pt-1 sm:text-left">
					<p class="text-sm font-medium text-title">
						{T()("auth.two.factor.setup.scan.title")}
					</p>
					<p class="mt-1 text-sm">
						{T()("auth.two.factor.setup.scan.description")}
					</p>
					<p class="mt-4 text-xs font-medium text-subtitle">
						{T()("auth.two.factor.setup.key.label")}
					</p>
					<Show
						when={props.setup}
						fallback={<span class="skeleton mt-1.5 block h-8 w-full" />}
					>
						<button
							type="button"
							class="group mt-1.5 flex w-full cursor-copy items-center justify-between gap-3 rounded-md border border-border bg-card px-2.5 py-1.5 text-left focus-visible:border-primary focus-visible:outline-hidden"
							aria-label={T()("auth.two.factor.setup.key.copy")}
							onClick={() => void copy()}
						>
							<span class="hide-scrollbar min-w-0 overflow-x-auto whitespace-nowrap font-mono text-xs leading-5 tracking-wider text-title">
								{groupedSecret()}
							</span>
							<Show
								when={copied()}
								fallback={
									<TbOutlineCopy class="size-3.5 shrink-0 text-icon transition-colors duration-200 group-hover:text-primary" />
								}
							>
								<TbOutlineCheck class="size-3.5 shrink-0 text-success" />
							</Show>
						</button>
						{/* scanning doesn't work when the app is on the same phone */}
						<a
							href={props.setup?.uri}
							class="mt-3 hidden items-center gap-1.5 text-sm font-medium text-subtitle hover:text-primary-hover duration-200 transition-colors pointer-coarse:flex"
						>
							<TbOutlineExternalLink class="size-4" />
							{T()("auth.two.factor.setup.open.app")}
						</a>
					</Show>
				</div>
			</div>
		</Show>
	);
};

export default TwoFactorSetupPanel;
