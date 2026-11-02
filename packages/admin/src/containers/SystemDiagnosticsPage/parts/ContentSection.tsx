import type { Diagnostics } from "@types";
import { type Component, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import StateNote from "@/components/StateNote/StateNote";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";

/** Collections with their document counts, bricks and content locales. */
const ContentSection: Component<{
	data: Diagnostics;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const describeCollection = (
		collection: Diagnostics["content"]["collections"][number],
	) =>
		[
			T()(
				collection.mode === "single"
					? "diagnostics.content.mode.single"
					: "diagnostics.content.mode.multiple",
			),
			collection.localized ? T()("diagnostics.content.localized") : undefined,
			collection.revisions ? T()("diagnostics.content.revisions") : undefined,
			collection.documents === 1
				? T()("diagnostics.content.document.count")
				: T()("diagnostics.content.documents.count", {
						count: collection.documents,
					}),
		]
			.filter(Boolean)
			.join(" · ");

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.content.title")}
			description={T()("diagnostics.content.description")}
		>
			<InfoRow.Content
				title={T()("common.collections")}
				description={T()("diagnostics.content.collections.description")}
			>
				<Show
					when={props.data.content.collections.length > 0}
					fallback={
						<StateNote>{T()("diagnostics.collections.empty")}</StateNote>
					}
				>
					<DetailsList
						layout="columns"
						variant="plain"
						items={[
							...props.data.content.collections.map((collection) => ({
								label: collection.key,
								value: describeCollection(collection),
							})),
							{
								label: T()("diagnostics.content.bricks"),
								value: T()("diagnostics.content.bricks.count", {
									count: props.data.content.bricks,
								}),
							},
						]}
					/>
				</Show>
			</InfoRow.Content>
			<InfoRow.Content
				title={T()("settings.interface.content.locales.title")}
				description={T()("settings.interface.content.locales.description")}
			>
				<DetailsList
					layout="columns"
					variant="plain"
					items={contentLocaleStore.get.locales.map((locale) => ({
						label: locale.name || locale.code,
						value: locale.isDefault
							? `${locale.code} (${T()("common.default")})`
							: locale.code,
					}))}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default ContentSection;
