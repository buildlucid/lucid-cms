import type { AiUsageSession } from "@types";
import { type Component, Show } from "solid-js";
import Pill from "@/components/Pill/Pill";
import Table from "@/components/Table/Table";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import {
	formatAiCredits,
	formatAiUsageNumber,
	getAiUsageSessionTypeLabel,
} from "@/utils/ai-usage";

interface AiUsageSessionTableRowProps {
	index: number;
	session: AiUsageSession;
	onOpen: (session: AiUsageSession) => void;
}

const AiUsageSessionTableRow: Component<AiUsageSessionTableRowProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.details"),
					type: "button",
					icon: "info",
					onClick: () => props.onOpen(props.session),
				},
			]}
		>
			<Table.Cell column="session" minWidth={240}>
				<div class="flex flex-col gap-0.5">
					<span class="text-sm text-title line-clamp-1">
						{props.session.conversation?.title ??
							getAiUsageSessionTypeLabel(props.session.type)}
					</span>
					<Show when={props.session.conversation}>
						<span class="text-xs text-muted">
							{getAiUsageSessionTypeLabel(props.session.type)}
						</span>
					</Show>
				</div>
			</Table.Cell>
			<Table.Cell column="user">
				<Show
					when={props.session.user}
					fallback={
						<span class="text-sm text-body">
							{T()("ai.usage.session.user.system")}
						</span>
					}
				>
					{(user) => (
						<UserDisplay
							user={user()}
							variant="horizontal"
							size="xs"
							nameFormat="name"
						/>
					)}
				</Show>
			</Table.Cell>
			<Table.Text
				column="credits"
				text={formatAiCredits(props.session.credits)}
			/>
			<Table.Cell column="usage" minWidth={220}>
				<div class="flex flex-col gap-0.5 text-xs text-body">
					<span>
						{T()("ai.usage.tokens.summary", {
							input: formatAiUsageNumber(props.session.tokens.input),
							output: formatAiUsageNumber(props.session.tokens.output),
						})}
					</span>
					<Show
						when={
							props.session.requests.webSearches > 0 ||
							props.session.requests.webFetches > 0
						}
					>
						<span>
							{T()("ai.usage.web.summary", {
								searches: props.session.requests.webSearches,
								fetches: props.session.requests.webFetches,
							})}
						</span>
					</Show>
				</div>
			</Table.Cell>
			<Table.Cell column="requests">
				<div class="flex items-center gap-2 text-sm text-body">
					<span>{formatAiUsageNumber(props.session.requests.total)}</span>
					<Show when={props.session.requests.failed > 0}>
						<Pill variant="danger-subtle" size="xs">
							{T()("ai.usage.session.failed", {
								count: props.session.requests.failed,
							})}
						</Pill>
					</Show>
					<Show when={props.session.requests.pending > 0}>
						<Pill variant="outline" size="xs">
							{T()("ai.usage.session.pending")}
						</Pill>
					</Show>
				</div>
			</Table.Cell>
			<Table.Date
				column="lastActivityAt"
				date={props.session.lastActivityAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default AiUsageSessionTableRow;
