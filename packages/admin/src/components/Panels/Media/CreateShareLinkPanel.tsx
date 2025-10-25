import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	createSignal,
} from "solid-js";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";
import { Panel } from "@/components/Groups/Panel";
import { Input, Textarea } from "@/components/Groups/Form";

const CreateShareLinkPanel: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	callbacks?: {
		onCreateSuccess?: (mediaId: number, shareLinkId: number) => void;
	};
}> = (props) => {
	// ------------------------------
	// State
	const [getName, setName] = createSignal<string>("");
	const [getDescription, setDescription] = createSignal<string>("");
	const [getPassword, setPassword] = createSignal<string>("");
	const [getExpiresAt, setExpiresAt] = createSignal<string>("");

	// ---------------------------------
	// Mutations
	const createShareLink = api.mediaShareLinks.useCreateSingle({
		onSuccess: (data) => {
			const mediaId = props.id?.();
			if (mediaId === undefined) return console.error("No media id provided");
			props.callbacks?.onCreateSuccess?.(mediaId, data.data.id);
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Memos
	const mutationIsPending = createMemo(() => {
		return createShareLink.action.isPending;
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
				isLoading: false,
				isError: false,
			}}
			mutateState={{
				isLoading: mutationIsPending(),
				errors: createShareLink.errors(),
			}}
			callbacks={{
				onSubmit: () => {
					const mediaId = props.id?.();
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
				},
				reset: () => {
					createShareLink.reset();
					setName("");
					setDescription("");
					setPassword("");
					setExpiresAt("");
				},
			}}
			copy={{
				title: T()("create_share_link_panel_title"),
				description: T()("create_share_link_panel_description"),
				submit: T()("create"),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<Input
						id="share-link-name"
						value={getName()}
						onChange={setName}
						name="name"
						type="text"
						copy={{
							label: T()("name"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("name", createShareLink.errors)}
						theme="full"
					/>
					<Textarea
						id="share-link-description"
						value={getDescription()}
						onChange={setDescription}
						name="description"
						copy={{
							label: T()("description"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("description", createShareLink.errors)}
						theme="full"
					/>
					<Input
						id="share-link-password"
						value={getPassword()}
						onChange={setPassword}
						name="password"
						type="password"
						copy={{
							label: T()("password"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("password", createShareLink.errors)}
						theme="full"
					/>
					<Input
						id="share-link-expires-at"
						value={getExpiresAt()}
						onChange={setExpiresAt}
						name="expiresAt"
						type="datetime-local"
						copy={{
							label: T()("expires_at"),
							placeholder: T()("optional"),
						}}
						errors={getBodyError("expiresAt", createShareLink.errors)}
						theme="full"
					/>
				</>
			)}
		</Panel>
	);
};

export default CreateShareLinkPanel;
