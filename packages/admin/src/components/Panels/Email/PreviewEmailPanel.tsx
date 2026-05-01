import classNames from "classnames";
import DOMPurify from "dompurify";
import {
	FaSolidCalendar,
	FaSolidCommentDots,
	FaSolidEnvelope,
	FaSolidFile,
	FaSolidImage,
	FaSolidLink,
	FaSolidTag,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	For,
	Index,
	Show,
} from "solid-js";
import { Panel } from "@/components/Groups/Panel";
import { Table } from "@/components/Groups/Table";
import DetailsList from "@/components/Partials/DetailsList";
import PanelTabs from "@/components/Partials/PanelTabs";
import Pill from "@/components/Partials/Pill";
import EmailTransactionRow from "@/components/Tables/Rows/EmailTransactionRow";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

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

const PreviewEmailPanel: Component<PreviewEmailPanelProps> = (props) => {
	// ------------------------------
	// State
	const [activeTab, setActiveTab] = createSignal<
		"details" | "data" | "transactions"
	>("details");

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
	const templateDataJson = createMemo(() =>
		JSON.stringify(email.data?.data.data || {}, null, 2),
	);

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: email.isLoading,
				isError: email.isError,
			}}
			options={{
				padding: "24",
				hideFooter: true,
			}}
			copy={{
				title: T()("preview_email_panel_title"),
			}}
		>
			{() => (
				<>
					<div
						class={classNames(
							"relative border border-border rounded-md overflow-hidden",
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
									theme="warning-opaque"
									class="items-center gap-1.5 max-w-full shadow-sm"
								>
									<FaSolidTriangleExclamation size={10} />
									<span class="truncate">
										{T()("email_preview_inline_attachments_warning")}
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
					<PanelTabs
						items={[
							{ value: "details", label: T()("details") },
							{ value: "data", label: T()("data") },
							{ value: "transactions", label: T()("transactions") },
						]}
						active={activeTab()}
						onChange={setActiveTab}
					/>
					<Show when={activeTab() === "details"}>
						<DetailsList
							type="text"
							items={[
								{
									label: T()("subject"),
									value: email.data?.data.mailDetails.subject ?? undefined,
								},
								{
									label: T()("template"),
									value: email.data?.data.mailDetails.template ?? undefined,
								},
								{
									label: T()("priority"),
									value: email.data?.data.mailDetails.priority ?? undefined,
								},
								{
									label: T()("to"),
									value: email.data?.data.mailDetails.to ?? undefined,
								},
								{
									label: T()("from"),
									value: email.data?.data.mailDetails.from.address ?? undefined,
								},
								{
									label: T()("status"),
									value: email.data?.data.currentStatus ?? undefined,
								},
								{
									label: T()("type"),
									value: email.data?.data.type ?? undefined,
								},
								{
									label: T()("attempt_count"),
									value: email.data?.data.attemptCount ?? 0,
								},
								{
									label: T()("last_attempt_at"),
									value: dateHelpers.formatDate(
										email.data?.data.lastAttemptedAt,
									),
								},
							]}
						/>
					</Show>
					<Show when={activeTab() === "data"}>
						<div>
							<pre class="max-h-96 overflow-auto rounded-md border border-border bg-card-base p-4 text-sm text-card-contrast whitespace-pre-wrap break-words">
								<code>{templateDataJson()}</code>
							</pre>
						</div>
					</Show>
					<Show when={activeTab() === "transactions"}>
						<div class="bg-card-base border border-border rounded-md">
							<Table
								key={"email.transactions"}
								rows={email.data?.data.transactions?.length || 0}
								head={[
									{
										label: T()("status"),
										key: "status",
										icon: <FaSolidEnvelope />,
									},
									{
										label: T()("identifier"),
										key: "identifier",
										icon: <FaSolidTag />,
									},
									{
										label: T()("message"),
										key: "message",
										icon: <FaSolidCommentDots />,
									},
									{
										label: T()("created_at"),
										key: "createdAt",
										icon: <FaSolidCalendar />,
									},
									{
										label: T()("updated_at"),
										key: "updatedAt",
										icon: <FaSolidCalendar />,
									},
								]}
								state={{
									isLoading: false,
									isSuccess: true,
								}}
								options={{
									isSelectable: false,
									padding: "16",
								}}
								theme="secondary"
							>
								{({ include, isSelectable, selected, setSelected }) => (
									<Index each={email.data?.data.transactions || []}>
										{(transaction, i) => (
											<EmailTransactionRow
												index={i}
												transaction={transaction()}
												include={include}
												selected={selected[i]}
												options={{
													isSelectable,
													padding: "16",
												}}
												callbacks={{
													setSelected: setSelected,
												}}
												theme="secondary"
											/>
										)}
									</Index>
								)}
							</Table>
						</div>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default PreviewEmailPanel;
