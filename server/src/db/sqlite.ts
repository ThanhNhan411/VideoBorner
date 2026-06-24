import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

const schemaPath = path.resolve(config.rootDir, "server/src/db/schema.sql");
db.exec(fs.readFileSync(schemaPath, "utf8"));
