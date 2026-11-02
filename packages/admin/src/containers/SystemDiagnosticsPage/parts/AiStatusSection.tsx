import type { Diagnostics } from "@types";
import type { Component } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import T, { type TranslationKeys } from "@/translations";

const featureLabels: Array<
	[feature: keyof Diagnostics["ai"]["features"], label: TranslationKeys]
> = [
	["imageGeneration", "diagnostics.ai.feature.image.generation"],
	["audioGeneration", "diagnostics.ai.feature.audio.generation"],
	["altGeneration", "diagnostics.ai.feature.alt.generation"],
	["chatTitles", "diagnostics.ai.feature.chat.titles"],
	["agents", "diagnostics.ai.feature.agents"],
	["mcp", "diagnostics.ai.feature.mcp"],
];

const connectionLabels = {
	connected: "connection.status.connected",
	revoked: "connection.status.revoked",
	disconnected: "connection.status.disconnected",
} as const satisfies Record<Diagnostics["ai"]["connection"], TranslationKeys>;

/** Whether AI is on, the Lucid connection, enabled features and memory. */
const AiStatusSection: Component<{
	data: Diagnostics;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const enabledFeatures = () =>
		featureLabels
			.filter(([feature]) => props.data.ai.features[feature])
			.map(([, label]) => T()(label));
	const memory = () =>
		[
			props.data.ai.memory.personal
				? T()("diagnostics.ai.memory.personal")
				: undefined,
			props.data.ai.memory.shared
				? T()("diagnostics.ai.memory.shared")
				: undefined,
		].filter(Boolean);

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.ai.title")}
			description={T()("diagnostics.ai.description")}
		>
			<InfoRow.Content>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{
							label: T()("diagnostics.ai.enabled"),
							value: props.data.ai.enabled
								? T()("common.yes")
								: T()("common.no"),
						},
						{
							label: T()("diagnostics.ai.connection"),
							value: T()(connectionLabels[props.data.ai.connection]),
						},
						{
							label: T()("diagnostics.ai.features"),
							value: enabledFeatures().join(", ") || T()("common.none"),
						},
						{
							label: T()("diagnostics.ai.memory"),
							value: memory().join(", ") || T()("common.none"),
						},
					]}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default AiStatusSection;
