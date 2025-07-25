import { getModels } from "../src/back/db";
import { DB } from "../src/back/db/client";

const config = {};
const sql = new DB(config);
const models = getModels(sql);

const [username, email, password] = process.argv.slice(2);

if (!username || !email || !password) {
	console.error("Usage: createAdmin <username> <email> <password>");
	process.exit(1);
}

models.userModel.createUser(
	username,
	email,
	await Bun.password.hash(password),
);
