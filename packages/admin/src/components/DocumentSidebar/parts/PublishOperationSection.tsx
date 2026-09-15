import type { Collection, PublishOperation } from "@types";
import type { JSXElement } from "solid-js";
import { type Accessor, type Component, For, Match, Switch } from "solid-js";
import DocumentSidebarSection from "@/components/DocumentSidebarSection/DocumentSidebarSection";
import PublishRequestRow from "@/components/PublishRequestRow/PublishRequestRow";
import type { SectionPreferenceKey } from "@/store/userPreferencesStore/userPreferencesStore";

const PublishOperationSection: Component<{
	title: string;
	icon: JSXElement;
	preferenceKey: SectionPreferenceKey;
	emptyCopy: string;
	collection: Accessor<Collection | undefined>;
	rows: Array<PublishOperation>;
	isLoading: boolean;
	onSchedule: (_operation: PublishOperation) => void;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<DocumentSidebarSection
			title={props.title}
			icon={props.icon}
			preferenceKey={props.preferenceKey}
			meta={props.rows.length > 0 ? props.rows.length : undefined}
		>
			<Switch>
				<Match when={props.isLoading}>
					<div class="flex flex-col gap-2">
						<span class="skeleton h-14 rounded-md" />
						<span class="skeleton h-14 rounded-md" />
					</div>
				</Match>
				<Match when={props.rows.length === 0}>
					<div class="rounded-md border border-border bg-card-base p-3">
						<p class="text-sm text-body">{props.emptyCopy}</p>
					</div>
				</Match>
				<Match when={true}>
					<div class="overflow-hidden rounded-md border border-border bg-card-base">
						<For each={props.rows}>
							{(request) => (
								<PublishRequestRow
									collection={props.collection}
									request={request}
									onSchedule={props.onSchedule}
								/>
							)}
						</For>
					</div>
				</Match>
			</Switch>
		</DocumentSidebarSection>
	);
};

export default PublishOperationSection;
