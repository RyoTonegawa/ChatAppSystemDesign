-- Basic RLS policies, using app.user_id from the session.
-- Example: SET app.user_id = 'user-uuid';

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Channel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPresence" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_self ON "User"
  USING (id = current_setting('app.user_id', true));

CREATE POLICY membership_read ON "Membership"
  USING (userId = current_setting('app.user_id', true));

CREATE POLICY membership_write ON "Membership"
  FOR INSERT WITH CHECK (userId = current_setting('app.user_id', true));

CREATE POLICY message_read ON "Message"
  USING (
    channelId IN (
      SELECT channelId FROM "Membership" WHERE userId = current_setting('app.user_id', true)
    )
  );

CREATE POLICY message_write ON "Message"
  FOR INSERT WITH CHECK (
    senderId = current_setting('app.user_id', true)
    AND channelId IN (
      SELECT channelId FROM "Membership" WHERE userId = current_setting('app.user_id', true)
    )
  );

CREATE POLICY presence_read ON "UserPresence"
  USING (true);

CREATE POLICY presence_write ON "UserPresence"
  FOR INSERT WITH CHECK (userId = current_setting('app.user_id', true));
