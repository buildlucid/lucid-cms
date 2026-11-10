import type { Diagnostics } from "@types";
import { type Component, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import StateNote from "@/components/StateNote/StateNote";
import T from "@/translations";
import type { ClientDiagnostics } from "@/utils/diagnostics-report";

/** Installed plugins with the Lucid versions they support, and the admin extensions loaded in this browser. */
const PluginsSection: Component<{
	data: Diagnostics;
	client: ClientDiagnostics;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("common.plugins")}
			description={T()("diagnostics.plugins.description")}
		>
			<InfoRow.Content>
				<Show
					when={props.data.plugins.length > 0}
					fallback={<StateNote>{T()("diagnostics.plugins.empty")}</StateNote>}
				>
					<DetailsList
						layout="columns"
						variant="plain"
						items={props.data.plugins.map((plugin) => ({
							label: plugin.key,
							value: plugin.version ?? "-",
						}))}
					/>
				</Show>
			</InfoRow.Content>
			<InfoRow.Content title={T()("diagnostics.extensions.title")}>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{
							label: T()("diagnostics.extensions.routes"),
							value: props.client.extensions.routes.join(", ") || "-",
						},
						{
							label: T()("diagnostics.extensions.slots"),
							value: props.client.extensions.slots,
						},
					]}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default PluginsSection;
