-- Per-user read receipts for broadcast notifications (role / community rows),
-- so one recipient marking a shared notification read doesn't affect others.
CREATE TABLE IF NOT EXISTS notification_reads (
  "notificationId" integer NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  "userId" text NOT NULL,
  "readAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("notificationId", "userId")
);

CREATE INDEX IF NOT EXISTS notification_reads_user_idx ON notification_reads ("userId");
CREATE INDEX IF NOT EXISTS notifications_role_created_idx ON notifications (role, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications ("userId", "createdAt" DESC);
