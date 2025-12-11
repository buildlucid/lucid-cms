import T from "@/translations";
import {
	type Component,
	Show,
	createMemo,
	type JSX,
	type Accessor,
} from "solid-js";
import type { TimelineItem } from "@/hooks/document/useHistoryState";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import Button from "@/components/Partials/Button";
import Link from "@/components/Partials/Link";
import DetailsList from "@/components/Partials/DetailsList";
import { Input } from "@/components/Groups/Form";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { CollectionResponse, DocumentResponse } from "@types";
import { FaSolidArrowUpRightDots, FaSolidEye } from "solid-icons/fa";
import classNames from "classnames";

const Section: Component<{
	title?: string;
	description?: string;
	children: JSX.Element;
}> = (props) => {
	return (
		<section class="bg-card-base border border-border rounded-md p-4">
			<Show when={props.title || props.description}>
				<header class="flex items-start justify-between gap-3 mb-3">
					<div class="min-w-0">
						<Show when={props.title}>
							<h4 class="text-title text-sm">{props.title}</h4>
						</Show>
						<Show when={props.description}>
							<p class="text-sm text-body mt-0.5">{props.description}</p>
						</Show>
					</div>
				</header>
			</Show>
			{props.children}
		</section>
	);
};

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
	// Hooks & State

	// ----------------------------------
	// Memos
	const environments = createMemo(() => {
		return props.collection()?.config?.environments ?? [];
	});
	const isUnreleasedEnvironment = createMemo(() => {
		return (
			props.item.type === "environment" &&
			props.item.releaseStatus === "not_released"
		);
	});
	const isEnvironmentUpToDate = createMemo(() => {
		return (
			props.item.type === "environment" &&
			props.item.releaseStatus === "released" &&
			props.item.upToDate === true
		);
	});

	// ----------------------------------
	// Handlers
	const getTitle = () => {
		switch (props.item.type) {
			case "latest":
				return T()("latest");
			case "environment":
				return props.item.version;
			default:
				return T()("revision");
		}
	};

	const getTypeLabel = () => {
		switch (props.item.type) {
			case "latest":
				return T()("latest");
			case "environment":
				return T()("environment");
			default:
				return T()("revision");
		}
	};

	// ----------------------------------
	// Render
	return (
		<aside class="mt-6 mr-6 space-y-4">
			{/* hero */}
			<div class="relative overflow-hidden rounded-md border border-border bg-card-base p-4">
				<span
					class={classNames("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", {
						"from-primary-base/60 to-primary-base/20":
							props.item.type === "latest" || isEnvironmentUpToDate(),
						"from-warning-base/60 to-warning-base/20":
							props.item.type === "environment" &&
							!isUnreleasedEnvironment() &&
							!isEnvironmentUpToDate(),
						"from-error-base/60 to-error-base/20": isUnreleasedEnvironment(),
						"from-info-base/60 to-info-base/20": props.item.type === "revision",
					})}
				/>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h3 class="text-title truncate text-sm mb-2 capitalize">
							{getTitle()}
						</h3>
						<div class="flex items-center gap-2">
							<Pill theme="outline" class="text-sm">
								#{props.item.id}
							</Pill>
							<Show when={props.item.type === "environment"}>
								<Pill
									theme={
										isUnreleasedEnvironment()
											? "error-opaque"
											: isEnvironmentUpToDate()
												? "primary-opaque"
												: "warning-opaque"
									}
								>
									{isUnreleasedEnvironment()
										? "Unreleased"
										: isEnvironmentUpToDate()
											? "Synced"
											: "Out of sync"}
								</Pill>
							</Show>
						</div>
					</div>
					<div class="flex items-center gap-2 flex-shrink-0">
						<Show when={!isUnreleasedEnvironment()}>
							<Link
								theme="border-outline"
								size="icon"
								href={getDocumentRoute("edit", {
									collectionKey: props.collection()?.key ?? "",
									documentId: props.document()?.id,
									status: props.item.version,
								})}
							>
								<FaSolidEye />
							</Link>
						</Show>
						<Show when={props.item.type === "revision"}>
							<Button
								theme="danger-outline"
								size="icon"
								onClick={props.onRestore}
							>
								<FaSolidArrowUpRightDots />
							</Button>
						</Show>
					</div>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<Show when={!isUnreleasedEnvironment()}>
						<Link
							theme="secondary"
							size="small"
							classes="flex-1"
							href={getDocumentRoute("edit", {
								collectionKey: props.collection()?.key ?? "",
								documentId: props.document()?.id,
								status: props.item.version,
							})}
						>
							{T()("view")}
						</Link>
					</Show>
					<Show when={props.item.type === "revision"}>
						<Button
							theme="border-outline"
							size="small"
							classes="flex-1"
							onClick={props.onRestore}
						>
							{T()("restore_revision")}
						</Button>
					</Show>
					<Show when={environments().length > 0}>
						<Button
							theme="border-outline"
							size="small"
							classes="flex-1"
							onClick={props.onPromote}
							disabled={isUnreleasedEnvironment()}
						>
							{T()("promote_to_environment")}
						</Button>
					</Show>
				</div>
			</div>
			<Section>
				<DetailsList
					type="text"
					theme="contained"
					items={[
						{
							label: T()("type"),
							value: getTypeLabel(),
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
							value: `${T()("revision")} #${props.item.promotedFrom}`,
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
					]}
				/>
			</Section>
			<Section>
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
			</Section>
			<Show when={props.item.bricks}>
				<Section
					title={T()("content")}
					description={T()("revision_content_summary_description")}
				>
					<div class="flex flex-wrap items-center gap-2">
						<Pill theme="outline">
							{props.item.bricks?.builder?.length ?? 0} {T()("bricks")}
						</Pill>
						<Pill theme="outline">
							{props.item.bricks?.fixed?.length ?? 0} {T()("fixed_bricks")}
						</Pill>
					</div>
				</Section>
			</Show>
		</aside>
	);
};

export default TimelineDetails;
