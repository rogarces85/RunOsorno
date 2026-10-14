CREATE TABLE `login_attempts` (
	`key` varchar(120) NOT NULL,
	`ip` varchar(45) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `login_attempts_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `login_attempts_expires_idx` ON `login_attempts` (`expires_at`);