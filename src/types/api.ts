export interface Application {
	uuid: string;
	name: string;
	description?: string;
	fqdn?: string;
	status: string; // Coolify uses composite format e.g. "running:healthy", "exited:unhealthy"
	git_repository?: string;
	git_branch?: string;
	build_pack?: string;
	created_at: string;
	updated_at: string;
}

export interface Deployment {
	deployment_uuid: string;
	application_id: number;
	status: string; // "queued" | "in_progress" | "finished" | "failed" | "cancelled-by-user"
	commit?: string;
	commit_message?: string;
	finished_at?: string;
	created_at: string;
	updated_at?: string;
}

export interface DeploymentLog {
	timestamp: string;
	level?: string;
	message: string;
	container?: string;
}

export interface ServerInfo {
	id: number;
	uuid: string;
	name: string;
	ip: string;
	user: string;
	port: number;
	created_at: string;
	updated_at: string;
}

// Summary types for list endpoints (token-efficient)

export interface ApplicationSummary {
	uuid: string;
	name: string;
	status: string;
	fqdn?: string;
	git_repository?: string;
	git_branch?: string;
}

export interface DeploymentSummary {
	deployment_uuid: string;
	application_id: number;
	status: string;
	commit?: string;
	created_at: string;
}

export interface ServerSummary {
	uuid: string;
	name: string;
	ip: string;
}

// --- Phase 1 types ---

export interface Database {
	uuid: string;
	name: string;
	description?: string;
	database_type: string; // e.g. "standalone-postgresql", "standalone-mysql", "standalone-redis"
	status: string;
	destination_id?: number;
	destination_type?: string;
	environment_id?: number;
	image?: string;
	is_public?: boolean;
	public_port?: number;
	created_at: string;
	updated_at: string;
}

export interface DatabaseSummary {
	uuid: string;
	name: string;
	database_type: string;
	status: string;
}

export interface Service {
	uuid: string;
	name: string;
	description?: string;
	status: string;
	service_type?: string;
	destination_id?: number;
	destination_type?: string;
	environment_id?: number;
	docker_compose_raw?: string;
	created_at: string;
	updated_at: string;
}

export interface ServiceSummary {
	uuid: string;
	name: string;
	status: string;
	service_type?: string;
}

export interface EnvironmentVariable {
	uuid: string;
	key: string;
	value: string;
	is_preview: boolean;
	is_literal: boolean;
	is_multiline: boolean;
	is_shown_once: boolean;
	comment?: string;
}

// --- Phase 2 types ---

export interface Project {
	id: number;
	uuid: string;
	name: string;
	description?: string;
}

export interface ProjectSummary {
	uuid: string;
	name: string;
	description?: string;
}

export interface Environment {
	id: number;
	uuid: string;
	name: string;
	project_id: number;
	description?: string;
	created_at: string;
	updated_at: string;
}

export interface EnvironmentSummary {
	uuid: string;
	name: string;
}

// --- Phase 4 types ---

export interface PrivateKey {
	id: number;
	uuid: string;
	name: string;
	description?: string;
	fingerprint?: string;
	is_git_related?: boolean;
	created_at: string;
	updated_at: string;
}

export interface PrivateKeySummary {
	uuid: string;
	name: string;
	description?: string;
	fingerprint?: string;
}

// --- Phase 3 types ---

export interface Team {
	id: number;
	name: string;
	description?: string;
	personal_team?: boolean;
	created_at: string;
	updated_at: string;
}

export interface TeamSummary {
	id: number;
	name: string;
	description?: string;
}

export interface TeamMember {
	id: number;
	name: string;
	email: string;
	role?: string;
}

// --- Scheduled Tasks types ---

export interface ScheduledTask {
	uuid: string;
	name: string;
	command: string;
	frequency: string;
	container?: string;
	timeout?: number;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface ScheduledTaskSummary {
	uuid: string;
	name: string;
	frequency: string;
	enabled: boolean;
}

export interface ScheduledTaskExecution {
	id: number;
	status: string;
	message?: string;
	created_at: string;
}

// --- Storage/Volumes types (Coolify v4.3+) ---

export type StorageType = "persistent" | "file";

export interface Storage {
	uuid: string;
	name: string;
	mount_path: string;
	host_path?: string;
	content?: string;
	/** Present on normalized list responses; required by create/update APIs. */
	type?: StorageType;
	/** Service storages only: owning application/database sub-resource UUID. */
	resource_uuid?: string;
	resource_type?: string;
	created_at: string;
	updated_at: string;
}

/** Raw list response from Coolify storage endpoints. */
export interface StorageListResponse {
	persistent_storages: Storage[];
	file_storages: Storage[];
}

export interface StorageSummary {
	uuid: string;
	name: string;
	mount_path: string;
	host_path?: string;
	type?: StorageType;
	resource_uuid?: string;
}

export interface VolumeBackupSchedule {
	uuid: string;
	message?: string;
	storage_uuid: string;
	storage_type: "persistent" | "directory";
	frequency: string;
	enabled: boolean;
	save_s3: boolean;
	disable_local_backup: boolean;
	stop_during_backup: boolean;
	s3_storage_uuid?: string | null;
	retention_amount_locally: number;
	retention_days_locally: number;
	retention_max_storage_locally: number;
	retention_amount_s3: number;
	retention_days_s3: number;
	retention_max_storage_s3: number;
	timeout: number;
}

export interface VolumeBackupScheduleInput {
	frequency: string;
	enabled?: boolean;
	save_s3?: boolean;
	disable_local_backup?: boolean;
	stop_during_backup?: boolean;
	s3_storage_uuid?: string | null;
	retention_amount_locally?: number;
	retention_days_locally?: number;
	retention_max_storage_locally?: number;
	retention_amount_s3?: number;
	retention_days_s3?: number;
	retention_max_storage_s3?: number;
	timeout?: number;
}

// --- GitHub Apps types ---

export interface GitHubApp {
	id: number;
	uuid: string;
	name: string;
	organization_id?: number;
	app_id?: number;
	installation_id?: number;
	html_url?: string;
	is_system_wide?: boolean;
	created_at: string;
	updated_at: string;
}

export interface GitHubAppSummary {
	id: number;
	uuid: string;
	name: string;
	is_system_wide?: boolean;
}

export interface GitHubRepository {
	id: number;
	full_name: string;
	private: boolean;
	html_url: string;
}

export interface GitHubBranch {
	name: string;
}

// --- Backup Execution types ---

export interface BackupExecution {
	id: number;
	status: string;
	message?: string;
	filename?: string;
	size?: number;
	created_at: string;
}

// Transformer functions

export function toApplicationSummary(app: Application): ApplicationSummary {
	return {
		uuid: app.uuid,
		name: app.name,
		status: app.status,
		fqdn: app.fqdn,
		git_repository: app.git_repository,
		git_branch: app.git_branch,
	};
}

export function toDeploymentSummary(dep: Deployment): DeploymentSummary {
	return {
		deployment_uuid: dep.deployment_uuid,
		application_id: dep.application_id,
		status: dep.status,
		commit: dep.commit,
		created_at: dep.created_at,
	};
}

export function toServerSummary(server: ServerInfo): ServerSummary {
	return {
		uuid: server.uuid,
		name: server.name,
		ip: server.ip,
	};
}

export function toDatabaseSummary(db: Database): DatabaseSummary {
	return {
		uuid: db.uuid,
		name: db.name,
		database_type: db.database_type,
		status: db.status,
	};
}

export function toServiceSummary(svc: Service): ServiceSummary {
	return {
		uuid: svc.uuid,
		name: svc.name,
		status: svc.status,
		service_type: svc.service_type,
	};
}

export function toProjectSummary(p: Project): ProjectSummary {
	return {
		uuid: p.uuid,
		name: p.name,
		description: p.description,
	};
}

export function toEnvironmentSummary(e: Environment): EnvironmentSummary {
	return {
		uuid: e.uuid,
		name: e.name,
	};
}

export function toPrivateKeySummary(key: PrivateKey): PrivateKeySummary {
	return {
		uuid: key.uuid,
		name: key.name,
		description: key.description,
		fingerprint: key.fingerprint,
	};
}

export function toTeamSummary(team: Team): TeamSummary {
	return {
		id: team.id,
		name: team.name,
		description: team.description,
	};
}

export function toScheduledTaskSummary(task: ScheduledTask): ScheduledTaskSummary {
	return {
		uuid: task.uuid,
		name: task.name,
		frequency: task.frequency,
		enabled: task.enabled,
	};
}

export function toStorageSummary(storage: Storage): StorageSummary {
	return {
		uuid: storage.uuid,
		name: storage.name,
		mount_path: storage.mount_path,
		host_path: storage.host_path,
		type: storage.type,
		resource_uuid: storage.resource_uuid,
	};
}

/** Flatten Coolify's `{ persistent_storages, file_storages }` list response. */
export function normalizeStorageList(
	response: Storage[] | StorageListResponse | null | undefined,
): Storage[] {
	if (!response) return [];
	if (Array.isArray(response)) return response;
	const persistent = (response.persistent_storages ?? []).map((s) => ({
		...s,
		type: "persistent" as const,
	}));
	const files = (response.file_storages ?? []).map((s) => ({
		...s,
		type: "file" as const,
	}));
	return [...persistent, ...files];
}

export function toGitHubAppSummary(app: GitHubApp): GitHubAppSummary {
	return {
		id: app.id,
		uuid: app.uuid,
		name: app.name,
		is_system_wide: app.is_system_wide,
	};
}
