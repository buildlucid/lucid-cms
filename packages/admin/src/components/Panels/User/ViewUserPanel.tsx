import T from "@/translations";
import { type Component, type Accessor, createMemo, Show } from "solid-js";
import api from "@/services/api";
import dateHelpers from "@/utils/date-helpers";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import DetailsList from "@/components/Partials/DetailsList";
import type { AuthProvidersResponse, UserResponse } from "@types";

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
	const providers = api.auth.useGetProviders({
		queryParams: {},
		enabled: () => props.state.open,
	});

	// ---------------------------------
	// Memos
	const panelFetchState = createMemo(() => {
		return {
			isLoading: user.isLoading || providers.isLoading,
			isError: user.isError || providers.isError,
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
					providers={providers.data?.data.providers}
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
	providers: AuthProvidersResponse["providers"] | undefined;
}> = (props) => {
	// ---------------------------------
	// Memos
	const userRoles = createMemo(() => {
		return props.state.user?.roles?.map((r) => r.name).join(", ") || "-";
	});
	const providersByKey = createMemo(() => {
		const map: Record<string, AuthProvidersResponse["providers"][number]> = {};
		const list = props.providers ?? [];
		for (const provider of list) {
			map[provider.key] = provider;
		}
		return map;
	});
	const linkedProviders = createMemo(() => {
		const authProviders = props.state.user?.authProviders ?? [];
		return authProviders
			.map((linked) => {
				const provider = providersByKey()[linked.providerKey];
				if (!provider) return null;
				return {
					provider,
					linked,
				};
			})
			.filter(
				(
					item,
				): item is {
					provider: AuthProvidersResponse["providers"][number];
					linked: NonNullable<UserResponse["authProviders"]>[number];
				} => item !== null,
			);
	});
	const authProviderItems = createMemo(() => {
		return linkedProviders().map(({ provider, linked }) => {
			const formattedDate = dateHelpers.formatFullDate(linked.linkedAt);
			return {
				label: provider.name,
				value: formattedDate
					? T()("linked_on", { date: formattedDate })
					: T()("linked"),
			};
		});
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
						value: props.state.user?.username || "-",
					},
					{
						label: T()("email"),
						value: props.state.user?.email || "-",
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
						show: props.state.user?.superAdmin !== undefined,
					},
					{
						label: T()("roles"),
						value: userRoles(),
						show:
							props.state.user?.roles !== undefined &&
							props.state.user?.roles.length > 0,
					},
					{
						label: T()("is_locked"),
						value: props.state.user?.isLocked ? T()("yes") : T()("no"),
						show: props.state.user?.isLocked !== undefined,
					},
				]}
			/>
			<SectionHeading title={T()("meta")} />
			<DetailsList
				type="text"
				items={[
					{
						label: T()("created_at"),
						value: props.state.user?.createdAt
							? dateHelpers.formatDate(props.state.user?.createdAt)
							: "-",
					},
					{
						label: T()("updated_at"),
						value: props.state.user?.updatedAt
							? dateHelpers.formatDate(props.state.user?.updatedAt)
							: "-",
					},
				]}
			/>
			<Show when={authProviderItems().length > 0}>
				<SectionHeading title={T()("auth_providers")} />
				<DetailsList type="text" items={authProviderItems()} />
			</Show>
		</>
	);
};

export default ViewUserPanel;
