import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import api from "@/services/api";
import Panel from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import JSONPreview from "@/components/Partials/JSONPreview";

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
		<Panel.Root
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: email.isLoading,
				isError: email.isError,
			}}
			options={{
				padding: "30",
				hideFooter: true,
			}}
			copy={{
				title: T()("preview_email_panel_title"),
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
								value: email.data?.data.deliveryStatus ?? undefined,
							},
							{
								label: T()("sent_count"),
								value: email.data?.data.sentCount ?? 0,
							},
							{
								label: T()("failed_count"),
								value: email.data?.data.errorCount ?? 0,
							},
							{
								label: T()("type"),
								value: email.data?.data.type ?? undefined,
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
					<SectionHeading title={T()("template_data")} />
					<JSONPreview
						title={T()("template_data")}
						json={email.data?.data.data || {}}
					/>
				</>
			)}
		</Panel.Root>
	);
};

export default PreviewEmailPanel;
