import type { OAuthConnection } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { Input } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import spawnToast from "@/utils/spawn-toast";

const UpdateOAuthConnection: Component<{
	connection: OAuthConnection;
	owner: OAuthConnectionOwner;
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const [name, setName] = createSignal(props.connection.name);

	// ----------------------------------------
	// Mutations
	const updateConnection = api.oauthConnections.useUpdateConnection({
		onSuccess: () => {
			props.state.setOpen(false);
			spawnToast({
				title: T()("oauth.connections.updated.title"),
				message: T()("oauth.connections.updated.message"),
				status: "success",
			});
		},
	});

	// ----------------------------------------
	// Memos
	const trimmedName = createMemo(() => name().trim());
	const canSubmit = createMemo(
		() =>
			trimmedName().length > 0 &&
			trimmedName() !== props.connection.name &&
			!updateConnection.action.isPending,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) {
			setName(props.connection.name);
			updateConnection.reset();
		}
	});

	// ----------------------------------------
	// Functions
	const close = () => {
		props.state.setOpen(false);
		updateConnection.reset();
	};
	const submit = () => {
		if (!canSubmit()) return;
		updateConnection.action.mutate({
			owner: props.owner,
			id: props.connection.id,
			name: trimmedName(),
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{ noPadding: true }}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<div class="p-4 md:p-6">
					<div class="mb-4">
						<h2 class="text-base font-semibold text-title">
							{T()("oauth.connections.update.title")}
						</h2>
						<p class="mt-1 text-sm">
							{T()("oauth.connections.update.description", {
								name: props.connection.clientName,
							})}
						</p>
					</div>
					<Input
						id={`oauth-connection-name-${props.connection.id}`}
						name="name"
						type="text"
						value={name()}
						onChange={setName}
						copy={{ label: T()("common.name") }}
						required={true}
						maxLength={120}
						noMargin={true}
						autoFoucs={true}
						errors={getBodyError("name", updateConnection.errors)}
					/>
				</div>
				<ModalFooter>
					<div class="min-w-0">
						<ErrorMessage
							theme="basic"
							message={updateConnection.errors()?.message}
						/>
					</div>
					<div class="flex min-w-max gap-2">
						<Button
							type="button"
							theme="border-outline"
							size="small"
							onClick={close}
							disabled={updateConnection.action.isPending}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="small"
							loading={updateConnection.action.isPending}
							disabled={!canSubmit()}
						>
							{T()("common.save")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default UpdateOAuthConnection;
