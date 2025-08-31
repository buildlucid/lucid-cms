import T from "@/translations";
import { type Component, type Accessor, Show, For } from "solid-js";
import api from "@/services/api";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import JSONPreview from "@/components/Partials/JSONPreview";
import dateHelpers from "@/utils/date-helpers";
import classNames from "classnames";
import { Accordion } from "@kobalte/core";
import Pill from "@/components/Partials/Pill";
import type { EmailDeliveryStatus } from "@lucidcms/core/types";

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
	// Helpers
	const getPillTheme = (deliveryStatus: EmailDeliveryStatus) => {
		if (deliveryStatus === "sent" || deliveryStatus === "delivered") {
			return "primary";
		}
		if (deliveryStatus === "failed") {
			return "red";
		}
		return "grey";
	};

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
				padding: "20",
				hideFooter: true,
			}}
			copy={{
				title: T()("preview_email_panel_title"),
				description: T()("preview_email_panel_description"),
			}}
		>
			{() => (
				<>
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
								label: T()("sent_count"),
								value: email.data?.data.attemptCount ?? 0,
							},
							{
								label: T()("last_attempt_at"),
								value: dateHelpers.formatDate(email.data?.data.lastAttemptedAt),
							},
						]}
					/>
					<SectionHeading title={T()("preview")} />
					<div class="border border-border rounded-md overflow-hidden mb-15">
						<iframe
							class="w-full h-96"
							srcdoc={email.data?.data.html || ""}
							title="Preview"
						/>
					</div>
					<Show when={email.data?.data.data}>
						<SectionHeading title={T()("template_data")} />
						<div
							class={classNames({
								"mb-15":
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
						<Accordion.Root multiple class="flex flex-col gap-2.5">
							<For each={email.data?.data.transactions}>
								{(transaction, i) => (
									<Accordion.Item
										value={`tx-${i()}`}
										class="border border-border rounded-md overflow-hidden"
									>
										<Accordion.Header>
											<Accordion.Trigger class="w-full flex items-center justify-between text-sm font-medium text-title bg-container-4/40 hover:bg-container-3/20 px-2.5 py-2.5 focus:outline-hidden focus:ring-1 ring-primary-base duration-200 transition-colors">
												<Pill theme={getPillTheme(transaction.deliveryStatus)}>
													{transaction.deliveryStatus}
												</Pill>
												<span class="text-body">
													{dateHelpers.formatDate(
														transaction.createdAt ?? null,
													)}
												</span>
											</Accordion.Trigger>
										</Accordion.Header>
										<Accordion.Content class="px-2.5 py-2 bg-container-4/40 border-t border-border">
											<DetailsList
												type="text"
												items={[
													{
														label: T()("status"),
														value: (
															<Pill
																theme={getPillTheme(transaction.deliveryStatus)}
															>
																{transaction.deliveryStatus}
															</Pill>
														),
													},
													{
														label: T()("identifier"),
														value: transaction.strategyIdentifier,
													},
													{
														label: T()("created_at"),
														value: dateHelpers.formatDate(
															transaction.createdAt,
														),
													},
													{
														label: T()("updated_at"),
														value: dateHelpers.formatDate(
															transaction.updatedAt,
														),
													},
												]}
											/>
										</Accordion.Content>
									</Accordion.Item>
								)}
							</For>
						</Accordion.Root>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default PreviewEmailPanel;
