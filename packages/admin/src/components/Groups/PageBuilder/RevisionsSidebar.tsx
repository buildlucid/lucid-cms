import T from "@/translations";
import { type Accessor, type Component, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import classNames from "classnames";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import { DynamicContent } from "@/components/Groups/Layout";
import { Sort, SimplifiedPagination } from "@/components/Groups/Query";
import type { DocumentVersionResponse, ResponseBody } from "@types";
import type useSearchParamsState from "@/hooks/useSearchParamsState";

export const RevisionsSidebar: Component<{
	state: {
		revisions: DocumentVersionResponse[];
		meta?: ResponseBody<unknown>["meta"];
		versionId: Accessor<number | undefined>;
		collectionKey: Accessor<string | undefined>;
		documentId: Accessor<number | undefined>;
		searchParams: ReturnType<typeof useSearchParamsState>;
		isLoading: Accessor<boolean>;
		isError: Accessor<boolean>;
		isSuccess: Accessor<boolean>;
		hideNoEntries?: boolean;
	};
}> = (props) => {
	// ----------------------------------
	// State
	const navigate = useNavigate();

	// ----------------------------------
	// Render
	return (
		<aside
			class={
				"w-full lg:max-w-[300px] flex flex-col justify-between bg-background-base border-b lg:border-b-0 lg:border-l border-border"
			}
		>
			<div>
				<div class="flex items-center justify-between border-b border-border gap-2.5 px-6 py-4">
					<h3>{T()("revisions")}</h3>
					<Sort
						sorts={[
							{
								label: T()("created_at"),
								key: "createdAt",
							},
						]}
						searchParams={props.state.searchParams}
					/>
				</div>
				<DynamicContent
					state={{
						isError: props.state.isError(),
						isSuccess: props.state.isSuccess(),
						isLoading: props.state.isLoading(),
						isEmpty:
							props.state.isSuccess() && props.state.revisions.length === 0,
						hasPermission: true,
					}}
					copy={{
						noEntries: {
							title: T()("no_revisions_found"),
							description: T()("no_revisions_found_message"),
							button: T()("back_to_document"),
						},
						error: {
							title: T()("error_title"),
							description: T()("error_message"),
						},
					}}
					options={{
						padding: "24",
						hideNoEntries: props.state.hideNoEntries,
					}}
				>
					<For each={props.state.revisions}>
						{(revision) => (
							<button
								type="button"
								class={classNames(
									"bg-card-base border-border border text-left rounded-md mb-2.5 last:mb-0 flex flex-col p-4 focus-visible:ring-1 focus:ring-primary-base duration-200 transition-colors hover:border-primary-base",
									{
										"border-primary-base":
											revision.id === props.state.versionId(),
									},
								)}
								onClick={() => {
									navigate(
										`/admin/collections/${props.state.collectionKey()}/revision/${props.state.documentId()}/${revision.id}`,
									);
								}}
							>
								<h3 class="mb-0.5 text-base">
									{T()("revision")} #{revision.id}
								</h3>
								<DateText date={revision.createdAt} />
								<div class="mt-2.5 flex gap-2.5">
									<Pill theme="grey">
										Bricks {revision.bricks?.builder?.length ?? 0}
									</Pill>
									<Pill theme="grey">
										Fixed {revision.bricks?.fixed?.length ?? 0}
									</Pill>
								</div>
							</button>
						)}
					</For>
				</DynamicContent>
			</div>
			<div class="p-4 md:p-6 border-t border-border">
				<SimplifiedPagination
					state={{
						meta: props.state.meta,
						searchParams: props.state.searchParams,
					}}
				/>
			</div>
		</aside>
	);
};
