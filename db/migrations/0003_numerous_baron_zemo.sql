DROP INDEX `audit_logs_action_idx` ON `audit_logs`;--> statement-breakpoint
CREATE INDEX `audit_logs_action_created_idx` ON `audit_logs` (`action`,`created_at`);