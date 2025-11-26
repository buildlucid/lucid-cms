import T from "@/translations";
import { type Component, type Accessor, Show, Index } from "solid-js";
import api from "@/services/api";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import JSONPreview from "@/components/Partials/JSONPreview";
import dateHelpers from "@/utils/date-helpers";
import classNames from "classnames";
import { Table } from "@/components/Groups/Table";
import EmailTransactionRow from "@/components/Tables/Rows/EmailTransactionRow";
import {
	FaSolidEnvelope,
	FaSolidCalendar,
	FaSolidTag,
	FaSolidCommentDots,
} from "solid-icons/fa";

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
				description: T()("preview_email_panel_description"),
			}}
		>
			{() => (
				<>
					<div class="border border-border rounded-md overflow-hidden mb-4">
						<iframe
							class="w-full h-96"
							srcdoc={email.data?.data.html || ""}
							title="Preview"
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
							<JSONPreview
								title={T()("template_data")}
								json={email.data?.data.data || {}}
							/>
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
