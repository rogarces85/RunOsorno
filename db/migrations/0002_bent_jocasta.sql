-- Fase 47, tarea 47.3: índices para `audit_logs` (que no tenía ninguno) y para
-- el orden por fecha de `notifications`.
--
-- El orden importa y no es el que genera drizzle-kit: MySQL necesita un índice
-- sobre `notifications.user_id` para la clave foránea, y hasta ahora ese índice
-- era `notifications_user_read_idx`. Si se intenta borrar antes de crear los
-- nuevos, falla con
--   ERROR 1553: Cannot drop index 'notifications_user_read_idx':
--   needed in a foreign key constraint.
--
-- Los índices nuevos empiezan igual por `user_id`, así que primero se crean y
-- después se puede borrar el viejo, que queda sin uso.
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_created_idx` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_created_idx` ON `notifications` (`user_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
DROP INDEX `notifications_user_read_idx` ON `notifications`;
