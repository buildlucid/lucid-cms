import type { EmailRef } from "@types";
import { TbOutlineEye, TbOutlinePencil, TbOutlineX } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import Pill from "@/components/Pill/Pill";
import PreviewEmailDrawer from "@/components/PreviewEmailDrawer/PreviewEmailDrawer";
import { userAvatarClasses } from "@/components/UserDisplay/UserDisplay";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { buildSafeEmailHtml, emailStatusPills } from "@/utils/emails";

/** Emails are designed around this width, so narrower cards scale the render down rather than reflowing it. */
const EMAIL_LAYOUT_WIDTH = 600;
const PREVIEW_HEIGHT = 240;

export const EmailPreviewCard: Component<{
	email: EmailRef;
	disabled?: boolean;
	onChange: () => void;
	onClear: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [previewOpen, setPreviewOpen] = createSignal(false);
	const [frameWidth, setFrameWidth] = createSignal(EMAIL_LAYOUT_WIDTH);
	let frameContainer: HTMLDivElement | undefined;

	// ----------------------------------------
	// Memos
	const canReadEmails = createMemo(
		() => userStore.get.hasPermission([Permissions.EmailRead]).all,
	);
	const emailId = createMemo(() => props.email.id);
	const scale = createMemo(() =>
		Math.min(1, frameWidth() / EMAIL_LAYOUT_WIDTH),
	);
	const senderInitial = createMemo(() =>
		(props.email.from.name || props.email.from.address).charAt(0).toUpperCase(),
	);

	// ----------------------------------------
	// Queries
	const email = api.email.useGetSingle({
		queryParams: {
			location: {
				emailId: emailId,
			},
		},
		enabled: () => canReadEmails(),
	});
	const previewHtml = createMemo(() =>
		buildSafeEmailHtml(email.data?.data.html || ""),
	);

	// ----------------------------------------
	// Effects
	onMount(() => {
		if (!frameContainer) return;
		const element = frameContainer;
		const observer = new ResizeObserver(() => {
			setFrameWidth(element.clientWidth);
		});
		observer.observe(element);
		setFrameWidth(element.clientWidth);
		onCleanup(() => observer.disconnect());
	});

	// ----------------------------------------
	// Render
	return (
		<div class="group w-full border border-border rounded-md bg-input overflow-hidden">
			<div class="relative bg-card px-4 pt-4">
				<div
					class="overflow-hidden rounded-t-md border border-b-0 border-border bg-input"
					style={{
						"mask-image":
							"linear-gradient(to bottom, black calc(100% - 72px), transparent)",
					}}
				>
					<div class="flex items-center gap-2.5 border-b border-border px-4 py-3">
						<span
							class={userAvatarClasses({
								variant: "icon",
								size: "sm",
								bordered: true,
							})}
							aria-hidden="true"
						>
							{senderInitial()}
						</span>
						<div class="min-w-0 flex-1">
							<p class="text-xs text-subtitle truncate">
								<span class="font-medium">{props.email.from.name}</span>{" "}
								<span class="text-muted">
									&lt;{props.email.from.address}&gt;
								</span>
							</p>
							<Show when={props.email.to}>
								<p class="text-xs text-muted truncate">
									{T()("common.to")}: {props.email.to}
								</p>
							</Show>
						</div>
						<span class="shrink-0 text-xs text-muted">
							{dateHelpers.formatDate(props.email.createdAt)}
						</span>
					</div>
					<div
						ref={frameContainer}
						class="relative overflow-hidden bg-white"
						style={{ height: `${PREVIEW_HEIGHT}px` }}
					>
						<Switch>
							<Match when={!canReadEmails()}>
								<div class="flex h-full items-center justify-center bg-card px-6 text-center">
									<p class="text-sm text-muted">
										{T()("emails.preview.unavailable")}
									</p>
								</div>
							</Match>
							<Match when={email.isLoading}>
								<div class="h-full w-full animate-pulse bg-input" />
							</Match>
							<Match when={email.data}>
								<iframe
									class="pointer-events-none absolute top-0 left-0 block border-0 bg-white"
									style={{
										width: `${Math.max(EMAIL_LAYOUT_WIDTH, frameWidth())}px`,
										height: `${PREVIEW_HEIGHT / scale()}px`,
										transform: `scale(${scale()})`,
										"transform-origin": "top left",
									}}
									srcdoc={previewHtml()}
									title={props.email.subject}
									sandbox="allow-same-origin"
									referrerPolicy="no-referrer"
									tabIndex={-1}
								/>
							</Match>
						</Switch>
					</div>
				</div>
				<Show when={canReadEmails()}>
					<button
						type="button"
						class="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
						onClick={() => setPreviewOpen(true)}
						aria-label={T()("panels.email.preview.title")}
					/>
				</Show>
			</div>
			<div class="flex items-center justify-between gap-3 border-t border-border p-3">
				<div class="min-w-0">
					<p class="text-sm font-medium text-subtitle truncate">
						{props.email.subject}
					</p>
					<div class="mt-1 flex min-w-0 items-center gap-2">
						<Show when={props.email.currentStatus}>
							{(status) => (
								<Pill variant={emailStatusPills[status()]} size="xs">
									{status()}
								</Pill>
							)}
						</Show>
						<p class="text-xs text-muted truncate">{props.email.template}</p>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
					<Show when={canReadEmails()}>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							shape="square"
							onClick={() => setPreviewOpen(true)}
							aria-label={T()("panels.email.preview.title")}
						>
							<TbOutlineEye size={14} />
						</Button>
					</Show>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="square"
						onClick={props.onChange}
						disabled={props.disabled}
						aria-label={T()("common.edit")}
					>
						<TbOutlinePencil size={12} />
					</Button>
					<Button
						type="button"
						variant="danger-ghost"
						size="xs"
						shape="square"
						onClick={props.onClear}
						disabled={props.disabled}
						aria-label={T()("common.clear")}
					>
						<TbOutlineX size={14} />
					</Button>
				</div>
			</div>
			<Show when={canReadEmails()}>
				<PreviewEmailDrawer
					id={emailId}
					state={{
						open: previewOpen(),
						setOpen: setPreviewOpen,
					}}
				/>
			</Show>
		</div>
	);
};
