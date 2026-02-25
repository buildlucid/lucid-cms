import classNames from "classnames";
import DOMPurify from "dompurify";
import {
	FaSolidCalendar,
	FaSolidCommentDots,
	FaSolidEnvelope,
	FaSolidTag,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	Index,
	lazy,
	Show,
	Suspense,
} from "solid-js";
import SectionHeading from "@/components/Blocks/SectionHeading";
import { Panel } from "@/components/Groups/Panel";
import { Table } from "@/components/Groups/Table";
import DetailsList from "@/components/Partials/DetailsList";
import EmailTransactionRow from "@/components/Tables/Rows/EmailTransactionRow";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const JSONPreview = lazy(() => import("@/components/Partials/JSONPreview"));

const PREVIEW_DISABLE_LINKS_STYLE =
	"<style>a,area{pointer-events:none!important;cursor:default!important;}</style>";

const disablePreviewLinkInteractions = (html: string) => {
	if (!html) return html;

	if (/<\/head>/i.test(html)) {
		return html.replace(/<\/head>/i, `${PREVIEW_DISABLE_LINKS_STYLE}</head>`);
	}

	return `${PREVIEW_DISABLE_LINKS_STYLE}${html}`;
};

const buildSafePreviewHtml = (unsafeHtml: string) => {
	if (typeof window === "undefined") return unsafeHtml || "";

	try {
		const sanitized = DOMPurify.sanitize(unsafeHtml || "", {
			WHOLE_DOCUMENT: true,
			FORBID_TAGS: [
				"script",
				"iframe",
				"frame",
				"frameset",
				"object",
				"embed",
				"base",
				"meta",
			],
			FORBID_ATTR: ["srcdoc", "sandbox"],
		});

		return disablePreviewLinkInteractions(sanitized);
	} catch {
		return unsafeHtml || "";
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
					<div class="border border-border rounded-md overflow-hidden mb-4">
						<iframe
							class="w-full h-96"
							srcdoc={previewHtml()}
							title="Preview"
							sandbox=""
							referrerPolicy="no-referrer"
						/>
					</div>
					<SectionHeading title={T()("details")} />
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
								value: dateHelpers.formatDate(email.data?.data.lastAttemptedAt),
							},
						]}
					/>
					<Show when={email.data?.data.data}>
						<SectionHeading title={T()("template_data")} />
						<div
							class={classNames({
								"mb-4":
									email.data?.data.transactions?.length &&
									email.data?.data.transactions.length > 0,
							})}
						>
							<Suspense
								fallback={
									<div class="h-40 bg-card-base border border-border rounded-md animate-pulse" />
								}
							>
								<JSONPreview
									title={T()("template_data")}
									json={email.data?.data.data || {}}
								/>
							</Suspense>
						</div>
					</Show>
					<Show
						when={
							email.data?.data.transactions &&
							email.data?.data.transactions.length > 0
						}
					>
						<SectionHeading title={T()("transactions")} />
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
