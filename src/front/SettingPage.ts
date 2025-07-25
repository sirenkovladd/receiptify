import van from "vanjs-core";

const { div, h1, p, button, span, h3 } = van.tags;

const token = van.state<string>("");
const error = van.state<string | null>(null);
const tokenRevealed = van.state<boolean>(false);
const tokenFetched = van.state<boolean>(false);

const refreshToken = async () => {
	error.val = null;
	try {
		const res = await fetch("/api/token/refresh", { method: "POST" });
		if (!res.ok) throw new Error("Failed to refresh token");
		const data = await res.json();
		token.val = data.token;
		tokenFetched.val = true; // token can be revealed after refresh
		tokenRevealed.val = false; // still hidden until eye is pressed
	} catch (err: any) {
		error.val = err.message || "Unknown error";
	}
};

const copyToken = () => {
	navigator.clipboard.writeText(token.val);
};

const toggleReveal = () => {
	tokenRevealed.val = !tokenRevealed.val;
};

const SettingPage = () => {
	return div(
		{ class: "md3-container" },
		div(
			{ class: "md3-top-app-bar" },
			h1({ class: "md3-top-app-bar-title" }, "Settings")
		),
		div(
			{ class: "md3-card md3-card-elevated" },
			h3("API Credential Token"),
			p("Your API credential token:"),
			div(
				{ style: "display: flex; align-items: center; gap: 8px; margin: 16px 0;" },
				span(
					{ 
						style: "font-family: monospace; padding: 12px; background: var(--md-sys-color-surface-variant); border-radius: var(--md-sys-shape-corner-small); flex-grow: 1;",
						class: "md3-text-field"
					}, 
					() => tokenFetched.val ? (tokenRevealed.val ? token.val : "***") : "***"
				),
				() =>
					tokenFetched.val
						? button(
								{
									class: "md3-icon-button",
									onclick: toggleReveal,
									title: tokenRevealed.val ? "Hide token" : "Reveal token",
								},
								tokenRevealed.val ? "🙈" : "👁️"
							)
						: "",
				button(
					{
						class: "md3-icon-button",
						onclick: copyToken,
						disabled: () => !tokenFetched.val,
						title: "Copy token"
					},
					"📋"
				),
				button(
					{ 
						class: "md3-icon-button",
						onclick: refreshToken,
						title: "Refresh token"
					},
					"🔄"
				),
			),
			() => error.val ? p({ class: "error" }, error.val) : ""
		)
	);
};

export default SettingPage;
