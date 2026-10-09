CREATE TABLE `athlete_profiles` (
	`user_id` varchar(36) NOT NULL,
	`birth_date` date,
	`weight_kg` decimal(5,2),
	`height_cm` decimal(5,1),
	`max_hr` int,
	`resting_hr` int,
	CONSTRAINT `athlete_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36),
	`details` json,
	`ip_address` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`is_director` boolean NOT NULL DEFAULT false,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_group_id_user_id_pk` PRIMARY KEY(`group_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `group_requests` (
	`id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`coach_id` varchar(36) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requested_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp NULL DEFAULT NULL,
	`resolved_by` varchar(36),
	CONSTRAINT `group_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_requests_group_coach_unique` UNIQUE(`group_id`,`coach_id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`logo_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`entity_type` varchar(50),
	`entity_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_assignments` (
	`id` varchar(36) NOT NULL,
	`athlete_id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`session_date` date NOT NULL,
	`week_start` date NOT NULL,
	`status` enum('planned','in_progress','completed','partial','not_done') NOT NULL DEFAULT 'planned',
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_feedback` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_records` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`distance_km` decimal(6,2),
	`duration_minutes` int,
	`rpe` int,
	`comments` text,
	`not_done_reason` varchar(50),
	`custom_reason` text,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_records_assignment_id_unique` UNIQUE(`assignment_id`),
	CONSTRAINT `session_records_rpe_check` CHECK(rpe >= 1 AND rpe <= 10)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_id` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `sessions_session_id` PRIMARY KEY(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` varchar(36) NOT NULL,
	`athlete_id` varchar(36) NOT NULL,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_team_id_athlete_id_pk` PRIMARY KEY(`team_id`,`athlete_id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`coach_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` varchar(36) NOT NULL,
	`coach_id` varchar(36),
	`group_id` varchar(36),
	`name` varchar(150) NOT NULL,
	`session_type` varchar(50) NOT NULL,
	`is_official` boolean NOT NULL DEFAULT false,
	`is_shared` boolean NOT NULL DEFAULT false,
	`structure` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','coach','athlete') NOT NULL,
	`avatar_key` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`must_change_password` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp NULL DEFAULT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `athlete_profiles` ADD CONSTRAINT `athlete_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_requests` ADD CONSTRAINT `group_requests_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_requests` ADD CONSTRAINT `group_requests_coach_id_users_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_requests` ADD CONSTRAINT `group_requests_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_assignments` ADD CONSTRAINT `session_assignments_athlete_id_users_id_fk` FOREIGN KEY (`athlete_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_assignments` ADD CONSTRAINT `session_assignments_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_assignments` ADD CONSTRAINT `session_assignments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_feedback` ADD CONSTRAINT `session_feedback_assignment_id_session_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `session_assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_feedback` ADD CONSTRAINT `session_feedback_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_records` ADD CONSTRAINT `session_records_assignment_id_session_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `session_assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_athlete_id_users_id_fk` FOREIGN KEY (`athlete_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_coach_id_users_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_coach_id_users_id_fk` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `session_assignments_athlete_date_idx` ON `session_assignments` (`athlete_id`,`session_date`);--> statement-breakpoint
CREATE INDEX `session_assignments_athlete_week_idx` ON `session_assignments` (`athlete_id`,`week_start`);--> statement-breakpoint
CREATE INDEX `session_assignments_created_by_idx` ON `session_assignments` (`created_by`);--> statement-breakpoint
CREATE INDEX `teams_coach_id_idx` ON `teams` (`coach_id`);