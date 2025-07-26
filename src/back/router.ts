import type { RouterTypes } from "bun";
import { decrypt } from "./crypto";
import type { Models, User } from "./db";
import { AuthRoutes, ReceiptRoutes, StoreRoutes, TagRoutes } from "./routes";

const tokens: Record<string, [User, number]> = {};

export function getRouter(models: Models) {
	async function getUserFromToken(session: string) {
		if (tokens[session]) {
			return tokens[session][0];
		}
		try {
			const decrypted = await decrypt(session);
			const [id, _token, timestamp] = decrypted.split(";");
			if (!timestamp) {
				return null;
			}
			if (+timestamp < Date.now() / 1000) {
				return null;
			}
			const user = await models.userModel.getUserById(Number(id));
			if (user) {
				tokens[session] = [user, +timestamp];
				return user;
			}
			return null;
		} catch (_err) {
			return null;
		}
	}

	const authRoutes = new AuthRoutes(models, tokens, getUserFromToken);
	const receiptRoutes = new ReceiptRoutes(models, getUserFromToken);
	const storeRoutes = new StoreRoutes(models, getUserFromToken);
	const tagRoutes = new TagRoutes(models, getUserFromToken);

	const router: Record<string, RouterTypes.RouteValue<string>> = {
		...authRoutes.getRoutes(),
		...receiptRoutes.getRoutes(),
		...storeRoutes.getRoutes(),
		...tagRoutes.getRoutes(),
	};

	return router;
}
