import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	createSignal,
	createEffect,
	Show,
} from "solid-js";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";
import userStore from "@/store/userStore";
import helpers from "@/utils/helpers";
import Panel from "@/components/Groups/Panel";
import Form from "@/components/Groups/Form";

interface UpdateUserPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const UpdateUserPanel: Component<UpdateUserPanelProps> = (props) => {
	// ------------------------------
	// State
	const [getSelectedRoles, setSelectedRoles] = createSignal<
		SelectMultipleValueT[]
	>([]);
	const [getIsSuperAdmin, setIsSuperAdmin] = createSignal<1 | 0>(0);

	// ---------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: {
				permissions: false,
			},
			perPage: -1,
		},
		enabled: () => !props.id(),
	});
	const user = api.users.useGetSingle({
		queryParams: {
			location: {
				userId: props.id,
			},
		},
		enabled: () => !!props.id(),
	});

	// ---------------------------------
	// Mutations
	const updateUser = api.users.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (user.isSuccess) {
			setSelectedRoles(
				user.data?.data.roles?.map((role) => {
					return {
						value: role.id,
						label: role.name,
					};
				}) || [],
			);
			setIsSuperAdmin(user.data?.data.superAdmin || 0);
		}
	});

	// ---------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return user.isLoading || roles.isLoading;
	});
	const isError = createMemo(() => {
		return user.isError || roles.isError;
	});
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				roleIds: user.data?.data.roles?.map((role) => role.id),
				superAdmin: user.data?.data.superAdmin,
			},
			{
				roleIds: getSelectedRoles().map((role) => role.value) as number[],
				superAdmin: getIsSuperAdmin(),
			},
		);
	});

	// ---------------------------------
	// Render
	return (
		<Panel.Root
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: isLoading(),
				isError: isError(),
			}}
			mutateState={{
				isLoading: updateUser.action.isPending,
				isDisabled: !updateData().changed,
				errors: updateUser.errors(),
			}}
			callbacks={{
				onSubmit: () => {
					updateUser.action.mutate({
						id: props.id() as number,
						body: updateData().data,
					});
				},
				reset: () => {
					updateUser.reset();
				},
			}}
			copy={{
				title: T()("update_user_panel_title"),
				description: T()("update_user_panel_description"),
				submit: T()("update"),
			}}
			options={{
				padding: "30",
			}}
		>
			{() => (
				<>
					<Form.SelectMultiple
						id="roles"
						values={getSelectedRoles()}
						onChange={setSelectedRoles}
						name={"roles"}
						copy={{
							label: T()("roles"),
						}}
						options={
							roles.data?.data.map((role) => {
								return {
									value: role.id,
									label: role.name,
								};
							}) || []
						}
						errors={getBodyError("roleIds", updateUser.errors)}
						theme="full"
					/>
					<Show when={userStore.get.user?.superAdmin}>
						<Form.Checkbox
							id="superAdmin"
							value={getIsSuperAdmin() === 1}
							onChange={(value) => setIsSuperAdmin(value ? 1 : 0)}
							name={"superAdmin"}
							copy={{
								label: T()("is_super_admin"),
							}}
							errors={getBodyError("superAdmin", updateUser.errors)}
							theme="full"
						/>
					</Show>
				</>
			)}
		</Panel.Root>
	);
};

export default UpdateUserPanel;
