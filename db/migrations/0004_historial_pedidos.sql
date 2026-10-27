CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`,`created_at`);--> statement-breakpoint
-- Pedidos anteriores al historial: se registra cuándo se recibieron y, si ya cambiaron, su estado actual.
INSERT INTO `order_events` (`store_id`, `order_id`, `status`, `created_at`) SELECT `store_id`, `id`, 'new', `created_at` FROM `orders`;--> statement-breakpoint
INSERT INTO `order_events` (`store_id`, `order_id`, `status`, `created_at`) SELECT `store_id`, `id`, `status`, `updated_at` FROM `orders` WHERE `status` <> 'new';
