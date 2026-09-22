import type { AuthProviders, User } from "@types";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import Drawer from "@/components/Drawer/Drawer";
import ProfilePicturePreviewCard from "@/components/ProfilePicturePreviewCard/ProfilePicturePreviewCard";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const ViewUserDrawer: Component<{
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

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={user.isLoading || providers.isLoading}
			error={
				user.isError || providers.isError
					? T()("errors.generic.message")
					: undefined
			}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.users.view.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body class="flex flex-col gap-3">
				<ViewUserPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
						user: user.data?.data,
					}}
					providers={providers.data?.data.providers}
				/>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

const ViewUserPanelContent: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		user: User | undefined;
	};
	providers: AuthProviders["providers"] | undefined;
}> = (props) => {
	// ---------------------------------
	// State
	const [activeTab, setActiveTab] = createSignal<"details" | "meta">("details");

	// ---------------------------------
	// Memos
	const userRoles = createMemo(() => {
		return props.state.user?.roles?.map((r) => r.name).join(", ") || "-";
	});
	const providersByKey = createMemo(() => {
		const map: Record<string, AuthProviders["providers"][number]> = {};
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
					provider: AuthProviders["providers"][number];
					linked: NonNullable<User["authProviders"]>[number];
				} => item !== null,
			);
	});
	const authProviderItems = createMemo(() => {
		return linkedProviders().map(({ provider, linked }) => {
			const formattedDate = dateHelpers.formatFullDate(linked.linkedAt);
			return {
				label: provider.name,
				value: formattedDate
					? T()("common.linked.on", { date: formattedDate })
					: T()("common.status.linked"),
			};
		});
	});

	// ---------------------------------
	// Render
	return (
		<>
			<ProfilePicturePreviewCard
				user={{
					username: props.state.user?.username,
					firstName: props.state.user?.firstName,
					lastName: props.state.user?.lastName,
					profilePicture: props.state.user?.profilePicture,
				}}
			/>
			<Drawer.Tabs
				items={[
					{ value: "details", label: T()("common.details") },
					{ value: "meta", label: T()("common.meta") },
				]}
				active={activeTab()}
				onChange={setActiveTab}
			/>
			<Show when={activeTab() === "details"}>
				<DetailsList
					class="mb-6 last:mb-0"
					items={[
						{
							label: T()("common.username"),
							value: props.state.user?.username || "-",
						},
						{
							label: T()("common.email"),
							value: props.state.user?.email || "-",
						},
						{
							label: T()("common.first.name"),
							value: props.state.user?.firstName || "-",
						},
						{
							label: T()("common.last.name"),
							value: props.state.user?.lastName || "-",
						},
						{
							label: T()("users.type"),
							value: props.state.user?.superAdmin
								? T()("users.super.admin.title")
								: T()("common.standard"),
							show: props.state.user?.superAdmin !== undefined,
						},
						{
							label: T()("common.roles"),
							value: userRoles(),
							show:
								props.state.user?.roles !== undefined &&
								props.state.user?.roles.length > 0,
						},
						{
							label: T()("users.status.locked.label"),
							value: props.state.user?.isLocked
								? T()("common.yes")
								: T()("common.no"),
							show: props.state.user?.isLocked !== undefined,
						},
					]}
				/>
				<Show when={authProviderItems().length > 0}>
					<SectionHeading title={T()("account.auth.providers.title")} />
					<DetailsList class="mb-6 last:mb-0" items={authProviderItems()} />
				</Show>
			</Show>
			<Show when={activeTab() === "meta"}>
				<DetailsList
					class="mb-6 last:mb-0"
					items={[
						{
							label: T()("common.created.at"),
							value: props.state.user?.createdAt
								? dateHelpers.formatDate(props.state.user?.createdAt)
								: "-",
						},
						{
							label: T()("common.updated.at"),
							value: props.state.user?.updatedAt
								? dateHelpers.formatDate(props.state.user?.updatedAt)
								: "-",
						},
					]}
				/>
			</Show>
		</>
	);
};

export default ViewUserDrawer;
