import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { databaseImportFields } from "../lib/api-schemas";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

const activityId = z
	.number()
	.int()
	.min(1)
	.describe("Import ID returned when the import was started");

export function registerDatabaseImportTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	const serviceDatabase = {
		uuid: schemas.uuid.describe("UUID of the service"),
		database_uuid: schemas.uuid.describe("UUID of the database inside the service"),
	};

	if (isToolAllowed("coolify_import_database", config)) {
		server.tool(
			"coolify_import_database",
			"[DESTRUCTIVE] Restore a backup into a standalone database from S3, a server path, or an earlier upload (Coolify v4.4+). Runs in the background; poll coolify_get_database_import. source=server also needs the deploy token ability.",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				...databaseImportFields,
				confirm: schemas.confirm,
			},
			async ({ uuid, confirm, ...fields }) => {
				if (!isToolAllowed("coolify_import_database", config))
					return readonlyError("coolify_import_database");
				const check = checkConfirmation(
					"coolify_import_database",
					{ uuid, ...fields, confirm },
					config,
				);
				if (!check.proceed && check.response) return check.response;
				return wrap(() => client.createDatabaseImport(uuid, fields));
			},
		);
	}

	server.tool(
		"coolify_get_database_import",
		"Get the status of a standalone database import (Coolify v4.4+). output needs the read:sensitive token ability.",
		{ uuid: schemas.uuid.describe("UUID of the database"), activity_id: activityId },
		async ({ uuid, activity_id }) => wrap(() => client.getDatabaseImport(uuid, activity_id)),
	);

	if (isToolAllowed("coolify_import_service_database", config)) {
		server.tool(
			"coolify_import_service_database",
			"[DESTRUCTIVE] Restore a backup into a database of a service from S3, a server path, or an earlier upload (Coolify v4.4+). Runs in the background; poll coolify_get_service_database_import. source=server also needs the deploy token ability.",
			{ ...serviceDatabase, ...databaseImportFields, confirm: schemas.confirm },
			async ({ uuid, database_uuid, confirm, ...fields }) => {
				if (!isToolAllowed("coolify_import_service_database", config))
					return readonlyError("coolify_import_service_database");
				const check = checkConfirmation(
					"coolify_import_service_database",
					{ uuid, database_uuid, ...fields, confirm },
					config,
				);
				if (!check.proceed && check.response) return check.response;
				return wrap(() => client.createServiceDatabaseImport(uuid, database_uuid, fields));
			},
		);
	}

	server.tool(
		"coolify_get_service_database_import",
		"Get the status of a service database import (Coolify v4.4+). output needs the read:sensitive token ability.",
		{ ...serviceDatabase, activity_id: activityId },
		async ({ uuid, database_uuid, activity_id }) =>
			wrap(() => client.getServiceDatabaseImport(uuid, database_uuid, activity_id)),
	);
}
