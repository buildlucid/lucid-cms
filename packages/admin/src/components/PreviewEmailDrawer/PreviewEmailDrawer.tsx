import classNames from "classnames";
import DOMPurify from "dompurify";
import {
	FaSolidFile,
	FaSolidImage,
	FaSolidLink,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	For,
	lazy,
	Show,
	Suspense,
} from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import Drawer from "@/components/Drawer/Drawer";
import Pill from "@/components/Pill/Pill";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const JSONPreview = lazy(() => import("@/components/JSONPreview/JSONPreview"));

const PREVIEW_DISABLE_LINKS_STYLE =
	"<style>a,area{pointer-events:none!important;cursor:default!important;}</style>";

const stripPreviewScripts = (html: string) =>
	html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

const disablePreviewLinkInteractions = (html: string) => {
	if (!html) return html;

	if (/<\/head>/i.test(html)) {
		return html.replace(/<\/head>/i, `${PREVIEW_DISABLE_LINKS_STYLE}</head>`);
	}

	return `${PREVIEW_DISABLE_LINKS_STYLE}${html}`;
};

const buildSafePreviewHtml = (unsafeHtml: string) => {
	if (typeof window === "undefined") return "";

	try {
		const sanitized = DOMPurify.sanitize(
			stripPreviewScripts(unsafeHtml || ""),
			{
				WHOLE_DOCUMENT: true,
				FORBID_TAGS: [
					"script",
					"noscript",
					"iframe",
					"frame",
					"frameset",
					"object",
					"embed",
					"base",
					"meta",
				],
				FORBID_ATTR: ["srcdoc", "sandbox"],
			},
		);

		return disablePreviewLinkInteractions(sanitized);
	} catch {
		return disablePreviewLinkInteractions(
			stripPreviewScripts(unsafeHtml || ""),
		);
	}
};

interface PreviewEmailPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const PreviewEmailDrawer: Component<PreviewEmailPanelProps> = (props) => {
	// ------------------------------
	// State
	const [activeTab, setActiveTab] = createSignal<"details" | "data">("details");

	// ---------------------------------
	// Queries
	const email = api.email.useGetSingle({
		queryParams: {
			location: {
				emailId: props.id,
			},
		},
		enabled: () => !!props.id(),
	});
	const previewHtml = createMemo(() =>
		buildSafePreviewHtml(email.data?.data.html || ""),
	);
	const attachments = createMemo(() => email.data?.data.attachments || []);
	const hasInlineAttachments = createMemo(() =>
		attachments().some((attachment) => attachment.disposition === "inline"),
	);

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={email.isLoading}
			error={email.isError ? T()("errors.generic.message") : undefined}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.email.preview.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body class="flex flex-col gap-3">
				<div
					class={classNames(
						"relative border border-border rounded-md overflow-hidden mb-3",
						{
							"mb-4": attachments().length === 0,
							"mb-3": attachments().length > 0,
						},
					)}
				>
					<iframe
						class="w-full h-96 bg-white"
						srcdoc={previewHtml()}
						title="Preview"
						sandbox="allow-same-origin"
						referrerPolicy="no-referrer"
						tabIndex={-1}
					/>
					<Show when={hasInlineAttachments()}>
						<div class="absolute bottom-3 left-3 z-10 pointer-events-none max-w-[calc(100%-1.5rem)]">
							<Pill
								variant="warning-subtle"
								class="items-center gap-1.5 max-w-full shadow-sm"
							>
								<FaSolidTriangleExclamation size={10} />
								<span class="truncate">
									{T()("email.preview.inline.attachments.warning")}
								</span>
							</Pill>
						</div>
					</Show>
				</div>
				<Show when={attachments().length > 0}>
					<div class="grid grid-cols-1 gap-2 mb-4">
						<For each={attachments()}>
							{(attachment) => (
								<div class="min-w-0 bg-card-base border border-border rounded-md p-3 flex gap-3">
									<div class="size-9 min-w-9 rounded-md bg-input-base flex items-center justify-center text-icon-base">
										<Show
											when={attachment.disposition === "inline"}
											fallback={<FaSolidFile size={14} />}
										>
											<FaSolidImage size={14} />
										</Show>
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-title truncate">
											{attachment.filename}
											<span class="text-unfocused font-normal">
												{" "}
												· {attachment.disposition}
											</span>
										</p>
										<div class="mt-1 flex items-center gap-2 min-w-0">
											<a
												class="min-w-0 text-xs text-unfocused hover:text-primary-base hover:underline inline-flex items-center gap-1"
												href={attachment.url}
												target="_blank"
												rel="noreferrer noopener"
											>
												<FaSolidLink class="shrink-0" size={10} />
												<span class="truncate">{attachment.url}</span>
											</a>
											<Show
												when={
													attachment.disposition === "inline" &&
													attachment.contentId
												}
											>
												<span class="shrink-0 text-xs text-unfocused">
													CID: {attachment.contentId}
												</span>
											</Show>
										</div>
									</div>
								</div>
							)}
						</For>
					</div>
				</Show>
				<Drawer.Tabs
					items={[
						{ value: "details", label: T()("common.details") },
						{ value: "data", label: T()("common.data") },
					]}
					active={activeTab()}
					onChange={setActiveTab}
				/>
				<Show when={activeTab() === "details"}>
					<DetailsList
						class="mb-6 last:mb-0"
						items={[
							{
								label: T()("common.subject"),
								value: email.data?.data.mailDetails.subject ?? undefined,
							},
							{
								label: T()("email.templates.singular"),
								value: email.data?.data.mailDetails.template ?? undefined,
							},
							{
								label: T()("common.priority"),
								value: email.data?.data.mailDetails.priority ?? undefined,
							},
							{
								label: T()("common.to"),
								value: email.data?.data.mailDetails.to ?? undefined,
							},
							{
								label: T()("common.from"),
								value: email.data?.data.mailDetails.from.address ?? undefined,
							},
							{
								label: T()("common.status"),
								value: email.data?.data.currentStatus ?? undefined,
							},
							{
								label: T()("common.type"),
								value: email.data?.data.type ?? undefined,
							},
							{
								label: T()("common.attempt.count"),
								value: email.data?.data.attemptCount ?? 0,
							},
							{
								label: T()("common.last.attempt.at"),
								value: dateHelpers.formatDate(email.data?.data.lastAttemptedAt),
							},
						]}
					/>
				</Show>
				<Show when={activeTab() === "data"}>
					<div>
						<Suspense
							fallback={
								<div class="h-40 bg-card-base border border-border rounded-md animate-pulse" />
							}
						>
							<JSONPreview json={email.data?.data.data || {}} />
						</Suspense>
					</div>
				</Show>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

export default PreviewEmailDrawer;
