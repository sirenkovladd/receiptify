import van from "vanjs-core";

const { div, h1, p, button, span } = van.tags;

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

const SettingPage = () =>{
	return div(
    h1("Settings"),
    div(
      p("Your API credential token:"),
			div(
				span(
					{ style: "font-family:monospace;" },
					() => tokenFetched.val
						? (tokenRevealed.val ? token.val : "***")
						: "***"
				),
				() => tokenFetched.val ?
					button({
						onclick: toggleReveal,
						style: "margin-left:8px;",
						title: tokenRevealed.val ? "Hide token" : "Reveal token"
					}, tokenRevealed.val ? "🙈" : "👁️") : '',
				button({
					onclick: copyToken,
					style: "margin-left:8px;",
					disabled: !tokenFetched.val
				}, "Copy"),
				button({ onclick: refreshToken, style: "margin-left:8px;" }, "Refresh Token"),
			),
		)
	)
};

export default SettingPage;
