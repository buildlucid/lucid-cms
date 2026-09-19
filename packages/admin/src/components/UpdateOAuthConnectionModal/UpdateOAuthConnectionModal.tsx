import type { OAuthConnection } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import spawnToast from "@/utils/spawn-toast";

const UpdateOAuthConnectionModal: Component<{
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
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("oauth.connections.update.title")}</Modal.Title>
					<Modal.Description>
						{T()("oauth.connections.update.description", {
							name: props.connection.clientName,
						})}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
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
				</Modal.Body>
				<Modal.Footer>
					<div class="min-w-0">
						<ErrorMessage
							theme="basic"
							message={updateConnection.errors()?.message}
						/>
					</div>
					<Modal.Actions>
						<Button
							type="button"
							variant="outline"
							size="md"
							onClick={close}
							disabled={updateConnection.action.isPending}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={updateConnection.action.isPending}
							disabled={!canSubmit()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default UpdateOAuthConnectionModal;
