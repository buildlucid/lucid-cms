import type { ProfilePicture } from "@types";
import { type Component, For, Show } from "solid-js";
import TableCell from "@/components/Table/parts/TableCell";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import helpers from "@/utils/helpers";

export type TableUserStackUser = {
	id?: number | null;
	email?: string | null;
	username?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	profilePicture?: ProfilePicture | null;
};

const TableUserStackCell: Component<{
	users: TableUserStackUser[];
	column?: string;
	minWidth?: number;
	maxVisible?: number;
}> = (props) => {
	// ----------------------------------
	// Functions
	const displayName = (user: TableUserStackUser) => {
		return helpers.formatUserName(user, "name") || T()("common.unknown");
	};

	// ----------------------------------
	// Render
	return (
		<TableCell column={props.column} minWidth={props.minWidth}>
			<Show
				when={props.users.length > 0}
				fallback={<span class="text-sm text-body">{T()("common.none")}</span>}
			>
				<div class="flex min-w-45 items-center gap-3">
					<div class="flex shrink-0 -space-x-2">
						<For each={props.users.slice(0, props.maxVisible ?? 4)}>
							{(user) => (
								<span class="rounded-full ring-2 ring-card">
									<UserDisplay user={user} variant="icon" size="xs" />
								</span>
							)}
						</For>
					</div>
					<div class="min-w-0">
						<p class="truncate text-sm text-subtitle">
							<For each={props.users}>
								{(user, index) => (
									<>
										{index() > 0 ? ", " : ""}
										{displayName(user)}
									</>
								)}
							</For>
						</p>
						<Show when={props.users.length > (props.maxVisible ?? 4)}>
							<p class="text-xs text-body">
								+{props.users.length - (props.maxVisible ?? 4)}
							</p>
						</Show>
					</div>
				</div>
			</Show>
		</TableCell>
	);
};

export default TableUserStackCell;
