import T from "@/translations";
import { type Component, type Accessor, createMemo } from "solid-js";
import api from "@/services/api";
import dateHelpers from "@/utils/date-helpers";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import type { UserResponse } from "@types";

const ViewUserPanel: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ---------------------------------
	// Queries
	const user = api.users.useGetSingle({
		queryParams: {
			location: {
				userId: props.id as Accessor<number | undefined>,
			},
		},
		enabled: () => props.state.open && props.id !== undefined,
	});

	// ---------------------------------
	// Memos
	const panelFetchState = createMemo(() => {
		return {
			isLoading: user.isLoading,
			isError: user.isError,
		};
	});

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={panelFetchState()}
			options={{
				padding: "24",
				hideFooter: true,
			}}
			copy={{
				title: T()("view_user_panel_title"),
				description: T()("view_user_panel_description"),
			}}
		>
			{() => (
				<ViewUserPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
						user: user.data?.data,
					}}
				/>
			)}
		</Panel>
	);
};

const ViewUserPanelContent: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		user: UserResponse | undefined;
	};
}> = (props) => {
	// ---------------------------------
	// Memos
	const userRoles = createMemo(() => {
		return props.state.user?.roles?.map((r) => r.name).join(", ") || "-";
	});

	// ---------------------------------
	// Render
	return (
		<>
			<SectionHeading title={T()("details")} />
			<DetailsList
				type="text"
				items={[
					{
						label: T()("username"),
						value: props.state.user?.username,
					},
					{
						label: T()("email"),
						value: props.state.user?.email,
					},
					{
						label: T()("first_name"),
						value: props.state.user?.firstName || "-",
					},
					{
						label: T()("last_name"),
						value: props.state.user?.lastName || "-",
					},
					{
						label: T()("user_type"),
						value: props.state.user?.superAdmin
							? T()("super_admin")
							: T()("standard"),
					},
					{
						label: T()("roles"),
						value: userRoles(),
					},
					{
						label: T()("is_locked"),
						value: props.state.user?.isLocked ? T()("yes") : T()("no"),
					},
				]}
			/>
			<SectionHeading title={T()("meta")} />
			<DetailsList
				type="text"
				items={[
					{
						label: T()("created_at"),
						value: dateHelpers.formatDate(props.state.user?.createdAt),
					},
					{
						label: T()("updated_at"),
						value: dateHelpers.formatDate(props.state.user?.updatedAt),
					},
				]}
			/>
		</>
	);
};

export default ViewUserPanel;
