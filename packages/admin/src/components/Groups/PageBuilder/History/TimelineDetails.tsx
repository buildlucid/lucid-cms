import type { CollectionResponse, DocumentResponse } from "@types";
import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createMemo,
	Match,
	Switch,
} from "solid-js";
import DateText from "@/components/Partials/DateText";
import DetailsList from "@/components/Partials/DetailsList";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import type { TimelineItem } from "@/hooks/document/useHistoryState";
import T from "@/translations";
import { getDocumentRoute } from "@/utils/route-helpers";

const TimelineDetails: Component<{
	item: TimelineItem;
	revisionName: string;
	onRevisionNameChange: (value: string) => void;
	onRestore: () => void;
	onPromote: () => void;
	collection: Accessor<CollectionResponse | undefined>;
	document: Accessor<DocumentResponse | undefined>;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isEnvironmentInSyncWithPromoted = createMemo(() => {
		return (
			props.item.type === "environment" &&
			props.item.isReleased &&
			props.item.inSyncWithPromotedFrom
		);
	});

	// ----------------------------------
	// Render
	return (
		<aside class="mt-4 lg:mt-6 mx-4 md:mx-6 lg:mx-0 lg:mr-6 mb-4 md:mb-6 lg:mb-0 space-y-4">
			{/* hero */}
			<section class="relative overflow-hidden rounded-md border border-border bg-card-base p-4">
				<span
					class={classNames("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", {
						"from-primary-base/60 to-primary-base/20":
							props.item.type === "latest" || isEnvironmentInSyncWithPromoted(),
						"from-warning-base/60 to-warning-base/20":
							props.item.type === "environment" &&
							!isEnvironmentInSyncWithPromoted(),
						"from-info-base/60 to-info-base/20": props.item.type === "revision",
					})}
				/>
				<div class="flex items-start justify-between gap-4">
					<h3 class="text-title truncate text-base mb-2 capitalize">
						<Switch>
							<Match when={props.item.type === "latest"}>{T()("latest")}</Match>
							<Match when={props.item.type === "environment"}>
								{props.item.version}
							</Match>
							<Match when={props.item.type === "revision"}>
								{T()("revision")}
							</Match>
						</Switch>
					</h3>
					<div class="flex items-center gap-2">
						<Pill theme="outline" class="text-sm">
							#{props.item.id}
						</Pill>
					</div>
				</div>
				<div class="mt-2 flex flex-wrap gap-2">
					<Link
						theme="border-outline"
						size="small"
						classes="w-full md:flex-1"
						href={getDocumentRoute("edit", {
							collectionKey: props.collection()?.key ?? "",
							documentId: props.document()?.id,
							status: props.item.version,
							versionId: props.item.id,
						})}
					>
						{props.item.type === "latest" ? T()("edit") : T()("view")}
					</Link>
				</div>
			</section>
			<section class="bg-card-base border border-border rounded-md p-4">
				<DetailsList
					type="text"
					theme="contained"
					items={[
						{
							label: T()("status"),
							value: (
								<div class="flex items-center gap-2">
									<Switch>
										<Match when={props.item.inSyncWithPromotedFrom}>
											<Pill theme="primary-opaque">{T()("in_sync")}</Pill>
										</Match>
										<Match when={!props.item.inSyncWithPromotedFrom}>
											<Pill theme="warning-opaque">{T()("out_of_sync")}</Pill>
										</Match>
									</Switch>
									<Switch>
										<Match when={props.item.promotedFromLatest}>
											<Pill theme="primary-opaque">{T()("latest")}</Pill>
										</Match>
										<Match when={!props.item.promotedFromLatest}>
											<Pill theme="warning-opaque">{T()("not_latest")}</Pill>
										</Match>
									</Switch>
								</div>
							),
							show: props.item.type === "environment",
						},
						{
							label: T()("type"),
							value: (
								<Switch>
									<Match when={props.item.type === "latest"}>
										{T()("latest")}
									</Match>
									<Match when={props.item.type === "environment"}>
										{T()("environment")}
									</Match>
									<Match when={props.item.type === "revision"}>
										{T()("revision")}
									</Match>
								</Switch>
							),
						},

						{
							label: T()("version_id"),
							value: `#${props.item.id}`,
						},
						{
							label: T()("created_at"),
							value: <DateText date={props.item.createdAt} />,
						},
						{
							label: T()("promoted_from"),
							value: props.item.promotedFrom,
							show: !!props.item.promotedFrom,
						},
						{
							label: T()("content_id"),
							value: (
								<span class="font-mono text-xs break-all">
									{props.item.contentId}
								</span>
							),
							show: !!props.item.contentId,
							stacked: true,
						},

						{
							label: T()("bricks"),
							value: (
								<Pill theme="outline">
									{props.item.bricks?.builder?.length ?? 0}
								</Pill>
							),
							show: props.item.type === "revision",
						},
						{
							label: T()("fixed_bricks"),
							value: (
								<Pill theme="outline">
									{props.item.bricks?.fixed?.length ?? 0}
								</Pill>
							),
							show: props.item.type === "revision",
						},
					]}
				/>
			</section>
			{/* <section class="bg-card-base border border-border rounded-md p-4">
				<Input
					id="revision-name"
					name="revision-name"
					type="text"
					value={props.revisionName}
					onChange={props.onRevisionNameChange}
					noMargin
					hideOptionalText
					copy={{
						label: T()("revision_name"),
						placeholder: T()("revision_name_placeholder"),
					}}
				/>
			</section> */}
		</aside>
	);
};

export default TimelineDetails;
