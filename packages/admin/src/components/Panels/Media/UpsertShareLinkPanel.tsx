import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	createSignal,
	createEffect,
	Show,
} from "solid-js";
import api from "@/services/api";
import helpers from "@/utils/helpers";
import { getBodyError } from "@/utils/error-helpers";
import { Panel } from "@/components/Groups/Panel";
import { Input, Textarea, Checkbox } from "@/components/Groups/Form";
import dateHelpers from "@/utils/date-helpers";

interface UpsertShareLinkPanelProps {
	mediaId?: Accessor<number | undefined>;
	linkId?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	callbacks?: {
		onCreateSuccess?: (mediaId: number, shareLinkId: number) => void;
	};
}

const UpsertShareLinkPanel: Component<UpsertShareLinkPanelProps> = (props) => {
	// ------------------------------
	// State
	const [getName, setName] = createSignal<string>();
	const [getDescription, setDescription] = createSignal<string>();
	const [getPassword, setPassword] = createSignal<string>();
	const [getExpiresAt, setExpiresAt] = createSignal<string>();
	const [getRemovePassword, setRemovePassword] = createSignal<boolean>(false);

	// ---------------------------------
	// Query
	const shareLink = api.mediaShareLinks.useGetSingle({
		queryParams: {
			location: {
				mediaId: props.mediaId as Accessor<number | undefined>,
				id: props.linkId as Accessor<number | undefined>,
			},
		},
		key: () => props.state.open,
		enabled: () => props.state.open && mode() !== "create",
	});

	// ---------------------------------
	// Mutations
	const createShareLink = api.mediaShareLinks.useCreateSingle({
		onSuccess: (data) => {
			const mediaId = props.mediaId?.();
			if (mediaId === undefined) return console.error("No media id provided");
			props.callbacks?.onCreateSuccess?.(mediaId, data.data.id);
			props.state.setOpen(false);
		},
	});
	const updateShareLink = api.mediaShareLinks.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (shareLink.isSuccess) {
			setName(shareLink.data?.data.name || "");
			setDescription(shareLink.data?.data.description || "");
			setPassword("");
			setExpiresAt(
				dateHelpers.toDateInputValue(shareLink.data?.data.expiresAt),
			);
		}
	});

	// ---------------------------------
	// Memos
	const mode = createMemo(() => {
		if (props.linkId === undefined || props.linkId() === undefined)
			return "create";
		return "update";
	});
	const isLoading = createMemo(() => {
		if (mode() === "create") return false;
		return shareLink.isLoading;
	});
	const isError = createMemo(() => {
		if (mode() === "create") return false;
		return shareLink.isError;
	});
	const panelTitle = createMemo(() => {
		if (mode() === "create") return T()("create_share_link_panel_title");
		return T()("update_share_link_panel_title");
	});
	const panelDescription = createMemo(() => {
		if (mode() === "create") return T()("create_share_link_panel_description");
		return T()("update_share_link_panel_description");
	});
	const panelSubmit = createMemo(() => {
		if (mode() === "create") return T()("create");
		return T()("update");
	});
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				name: shareLink.data?.data.name,
				description: shareLink.data?.data.description,
				expiresAt: shareLink.data?.data.expiresAt,
			},
			{
				name: getName(),
				description: getDescription(),
				expiresAt: getExpiresAt(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		if (mode() === "create") return false;
		return !updateData().changed && !getPassword() && !getRemovePassword();
	});
	const mutationIsPending = createMemo(() => {
		return createShareLink.action.isPending || updateShareLink.action.isPending;
	});
	const errors = createMemo(() => {
		if (mode() === "create") return createShareLink.errors();
		return updateShareLink.errors();
	});

	// ---------------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: isLoading(),
				isError: isError(),
			}}
			mutateState={{
				isLoading: mutationIsPending(),
				isDisabled: submitIsDisabled(),
				errors: errors(),
			}}
			callbacks={{
				onSubmit: () => {
					if (mode() === "create") {
						const mediaId = props.mediaId?.();
						if (mediaId === undefined) return;

						createShareLink.action.mutate({
							mediaId,
							body: {
								name: getName() || undefined,
								description: getDescription() || undefined,
								password: getPassword() || undefined,
								expiresAt: getExpiresAt() || undefined,
							},
						});
					} else {
						const mediaId = props.mediaId?.();
						const linkId = props.linkId?.();
						if (mediaId === undefined || linkId === undefined) return;

						const body: Record<string, unknown> = {
							...updateData().data,
						};

						//* handle password logic:
						// 1. If removePassword is checked, explicitly set to null
						// 2. Else if a new password is provided, set it
						// 3. Otherwise, don't include password in the update
						if (getRemovePassword()) {
							body.password = null;
						} else if (getPassword()) {
							body.password = getPassword();
						}

						updateShareLink.action.mutate({
							mediaId,
							linkId,
							body,
						});
					}
				},
				reset: () => {
					setName("");
					setDescription("");
					setPassword("");
					setExpiresAt("");
					setRemovePassword(false);
					createShareLink.reset();
					updateShareLink.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				description: panelDescription(),
				submit: panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<Input
						id="share-link-name"
						value={getName() || ""}
						onChange={setName}
						name="name"
						type="text"
						copy={{
							label: T()("name"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("name", errors)}
					/>
					<Textarea
						id="share-link-description"
						value={getDescription() || ""}
						onChange={setDescription}
						name="description"
						copy={{
							label: T()("description"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("description", errors)}
					/>
					<Show
						when={
							mode() === "update" &&
							shareLink.data?.data.hasPassword &&
							!getPassword()
						}
					>
						<Checkbox
							id="share-link-remove-password"
							name="removePassword"
							value={getRemovePassword()}
							onChange={(value) => {
								setRemovePassword(value);
								if (value) setPassword("");
							}}
							copy={{
								label: T()("remove_password"),
								describedBy: T()("share_link_remove_the_password"),
							}}
						/>
					</Show>
					<Show when={!getRemovePassword()}>
						<Input
							id="share-link-password"
							value={getPassword() || ""}
							onChange={(value) => {
								setPassword(value);
								//* if user starts typing a password, uncheck remove password
								if (value && getRemovePassword()) {
									setRemovePassword(false);
								}
							}}
							name="password"
							type="password"
							copy={{
								label: T()("password"),
								describedBy:
									mode() === "update" && shareLink.data?.data.hasPassword
										? T()("share_link_leave_blank_to_keep_existing")
										: undefined,
							}}
							errors={getBodyError("password", errors)}
						/>
					</Show>
					<Input
						id="share-link-expires-at"
						value={getExpiresAt() || ""}
						onChange={setExpiresAt}
						name="expiresAt"
						type="date"
						copy={{
							label: T()("expires_at"),
							placeholder: T()("optional"),
							describedBy: shareLink.data?.data.hasExpired
								? T()("share_link_expired_description")
								: undefined,
						}}
						errors={getBodyError("expiresAt", errors)}
					/>
				</>
			)}
		</Panel>
	);
};

export default UpsertShareLinkPanel;
