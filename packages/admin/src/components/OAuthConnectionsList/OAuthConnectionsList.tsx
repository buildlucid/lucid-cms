import { TbOutlineWorld } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import CardState from "@/components/CardState/CardState";
import OAuthConnectionRow from "@/components/OAuthConnectionRow/OAuthConnectionRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import SkeletonCardRows from "@/components/SkeletonCardRows/SkeletonCardRows";
import StateNote from "@/components/StateNote/StateNote";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";

/**
 * Lists connections as stacked `cards` or divided `rows`. Use rows in `InfoRow.Content` with
 * `padding="none"`.
 */
export const OAuthConnectionsList: Component<{
	owner: OAuthConnectionOwner;
	canUpdate: boolean;
	canRevoke: boolean;
	/** @default "cards" */
	variant?: "cards" | "rows";
}> = (props) => {
	// ----------------------------------------
	// Queries
	const connections = api.oauthConnections.useGetConnections({
		queryParams: { owner: props.owner },
	});

	// ----------------------------------------
	// Memos
	const isRows = createMemo(() => props.variant === "rows");

	// ----------------------------------------
	// Render
	return (
		<QueryBoundary
			appearance={isRows() ? "contained" : "inline"}
			loading={connections.isLoading}
			loadingFallback={<SkeletonCardRows variant={isRows() ? "row" : "card"} />}
			error={connections.isLoadingError}
			onRetry={() => connections.refetch()}
			empty={connections.isSuccess && connections.data.data.length === 0}
			emptyFallback={
				<Show
					when={isRows()}
					fallback={<StateNote>{T()("oauth.connections.empty")}</StateNote>}
				>
					<CardState
						icon={<TbOutlineWorld />}
						title={T()("oauth.connections.empty.title")}
						description={T()("oauth.connections.empty.description")}
					/>
				</Show>
			}
		>
			<ul class={isRows() ? "divide-y divide-border" : "flex flex-col gap-3"}>
				<For each={connections.data?.data ?? []}>
					{(connection) => (
						<li>
							<OAuthConnectionRow
								connection={connection}
								owner={props.owner}
								canUpdate={props.canUpdate}
								canRevoke={props.canRevoke}
								variant={isRows() ? "row" : "card"}
							/>
						</li>
					)}
				</For>
			</ul>
		</QueryBoundary>
	);
};
