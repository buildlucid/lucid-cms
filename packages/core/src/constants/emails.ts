const emailConstants = Object.freeze({
	assets: {
		logo: "/admin/_assets/email-logo.png",
	},
	locations: {
		resetPassword: "/admin/reset-password",
		acceptInvitation: "/admin/accept-invitation",
		emailChangeConfirm: "/admin/email-change/confirm",
		emailChangeRevert: "/admin/email-change/revert",
		magicLink: "/admin/magic-link/verify",
		account: "/admin/account",
	},
	storage: {
		defaultPreviewFallback: "[REDACTED]",
		encryptedValueMarker: "__lucid_email_encrypted",
		encryptedValueVersion: 1,
		millisecondsInDay: 24 * 60 * 60 * 1000,
	},
	templates: {
		resetPassword: {
			key: "reset-password",
			external: false,
			storage: {
				resetLink: {
					neverStore: true,
				},
			},
		},
		userInvite: {
			key: "user-invite",
			external: false,
			storage: {
				inviteLink: {
					neverStore: true,
				},
			},
		},
		magicLink: {
			key: "magic-link",
			external: false,
			storage: {
				loginLink: {
					neverStore: true,
				},
				code: {
					neverStore: true,
				},
			},
		},
		passwordResetSuccess: {
			key: "password-reset-success",
			external: false,
			storage: null,
		},
		emailChanged: {
			key: "email-changed",
			external: false,
			storage: null,
		},
		emailChangeConfirm: {
			key: "email-change-confirm",
			external: false,
			storage: {
				confirmLink: {
					neverStore: true,
				},
			},
		},
		emailChangeRevert: {
			key: "email-change-revert",
			external: false,
			storage: {
				revertLink: {
					neverStore: true,
				},
			},
		},
		notification: {
			key: "notification",
			external: false,
			storage: null,
		},
	},
} as const);

export default emailConstants;
