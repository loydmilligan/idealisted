# Ntfy Setup Guide

## Overview

IdeaListed uses [ntfy](https://ntfy.sh) for push notifications. Ntfy is an open-source pub/sub notification service that sends notifications to your phone or desktop without requiring a proprietary app or service.

**Why ntfy?**
- Simple HTTP-based notifications
- Open-source and self-hostable
- Works across all platforms (iOS, Android, Web, Desktop)
- No API keys or registration required for public topics
- Optional authentication for private topics

**What IdeaListed uses it for:**
- Task reminder notifications (when tasks are due)
- Daily review reminders (evening check-in prompts)
- Idea capture confirmations (optional)
- Planner milestone notifications (plan finalized, review complete, all tasks done)
- Entity creation notifications (optional)

## Prerequisites

### 1. Install the ntfy app

**Mobile:**
- iOS: [ntfy on App Store](https://apps.apple.com/us/app/ntfy/id1625396347)
- Android: [ntfy on Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/)

**Desktop/Web:**
- Web: Visit [ntfy.sh](https://ntfy.sh) in your browser
- Desktop: [Download ntfy desktop app](https://github.com/binwiederhier/ntfy-desktop/releases)

### 2. Choose a topic name

Ntfy uses topics to route notifications. Your topic should be:
- Unique (to avoid receiving other people's notifications)
- Memorable (you'll need to enter it in settings)
- Private if needed (use authentication for sensitive notifications)

**Examples:**
- `idealisted-john-doe-2024` (unique, personal)
- `my-secret-tasks-abc123xyz` (random suffix for uniqueness)

**Topic security:**
- Public topics: Anyone who knows the topic can send/receive notifications
- Private topics: Require username/password authentication

### 3. Subscribe to your topic

In the ntfy app:
1. Tap/click "Subscribe to topic"
2. Enter your chosen topic name (e.g., `idealisted-john-doe-2024`)
3. For private topics: Enable authentication and enter username/password
4. Save the subscription

Your phone/device is now listening for notifications on that topic.

## Configuration

### Settings Page (IdeaListed)

1. Navigate to **Settings** (gear icon) → **NTFY** tab
2. Configure the following:

**Enable Notifications**
- Toggle on to enable ntfy notifications
- When disabled, no notifications will be sent

**Ntfy Server URL**
- Default: `https://ntfy.sh` (public server)
- Or enter your self-hosted server URL (e.g., `https://ntfy.example.com`)

**Ntfy Topic**
- Enter the exact topic name you subscribed to in step 3 (e.g., `idealisted-john-doe-2024`)
- Must match exactly (case-sensitive)

**Username (Optional)**
- Leave empty for public topics
- Enter username if using a private/protected topic

**Password (Optional)**
- Leave empty for public topics
- Enter password if using a private/protected topic

**Priority**
- Default: Normal priority
- Options: Low, Default, High, Urgent
- Affects notification sound/vibration on your device

### Notification Events

After enabling ntfy, you can control which events trigger notifications:

**Always enabled:**
- Task reminders (when tasks are due based on reminder datetime)

**Optional events** (configure in NTFY settings):
- Daily review reminders (evening check-in prompt at configured time)
- Milestone notifications (plan finalized, review complete, all tasks done)
- Idea captured confirmations
- Entity created notifications

### Advanced Settings

**Daily Review Reminder**
- Enable daily reminder toggle
- Set time for daily review notification (default: 19:00)
- Requires ntfy to be enabled

**Milestone Notifications**
- Toggle to enable/disable planner milestone notifications
- Milestones: Plan finalized, evening review complete, all tasks completed
- Provides progress updates and completion celebrations

## Testing

After configuration:

1. Click the **TEST** button in NTFY settings
2. You should receive a test notification on your subscribed device within seconds
3. If notification doesn't arrive, check:
   - Topic name matches exactly (case-sensitive)
   - Device is subscribed to the topic
   - Internet connection is active
   - For private topics: username/password are correct

## Troubleshooting

### No notifications received

**Check topic subscription:**
- Open ntfy app and verify you're subscribed to the correct topic
- Topic names are case-sensitive and must match exactly

**Check server URL:**
- Default is `https://ntfy.sh`
- If using self-hosted server, ensure URL is correct and accessible

**Check authentication (private topics):**
- Username and password must match exactly
- Test credentials by visiting `https://ntfy.sh/<your-topic>` in browser
- You should be prompted to log in if authentication is required

**Check network:**
- Ensure device has active internet connection
- Some corporate/school networks may block ntfy.sh

### Notifications delayed

**Notification priority:**
- Low/default priority may have delivery delays on some devices
- Try increasing priority to "High" or "Urgent" in settings

**Device battery optimization:**
- Some phones aggressively kill background apps
- Add ntfy app to battery optimization whitelist
- iOS: Settings → Notifications → ntfy → Allow Notifications
- Android: Settings → Apps → ntfy → Battery → Unrestricted

### Too many notifications

**Disable specific events:**
- Go to NTFY settings tab
- Disable optional notification events (idea captured, entity created)
- Keep only task reminders and daily review enabled

**Adjust daily reminder:**
- Disable daily review reminder if not needed
- Adjust time to be less intrusive

**Disable milestone notifications:**
- Toggle off milestone notifications if planner progress updates are too frequent

### Private topic not working

**Authentication required:**
- Private topics require username and password
- Must match the credentials configured on ntfy server
- For ntfy.sh: Create account at https://ntfy.sh/account

**Test credentials:**
- Visit `https://ntfy.sh/<your-topic>` in browser
- Enter username/password when prompted
- If login fails, credentials are incorrect

### Self-hosted server issues

**Server accessibility:**
- Ensure your ntfy server is publicly accessible (not localhost)
- HTTPS is recommended for mobile apps
- Check firewall rules allow incoming connections on ntfy port (default: 80/443)

**Server configuration:**
- Verify server is running: `systemctl status ntfy`
- Check server logs: `journalctl -u ntfy -f`
- Ensure no proxy/CDN is interfering with long-polling

## How It Works

### Architecture

1. **IdeaListed Server** → Sends HTTP POST to ntfy server with notification payload
2. **Ntfy Server** → Routes notification to all subscribers of the topic
3. **Your Device** → Receives notification via ntfy app (long-polling or push)

### Notification Format

Ntfy uses HTTP headers for metadata and body for message content:
- `Title`: Notification headline
- `Priority`: Delivery urgency (low/default/high/urgent)
- `Tags`: Emoji/icons (IdeaListed uses brain, lightbulb icons)
- `Actions`: Optional buttons (e.g., "Mark Complete", "View Plan")
- Body: Plain text message

### Security

**Public topics:**
- Anyone with topic name can send/receive notifications
- Use long, unique topic names with random suffixes
- Not suitable for sensitive data

**Private topics:**
- Require HTTP Basic Auth (username/password)
- Only authenticated clients can send/receive
- Recommended for personal use

**Self-hosted:**
- Full control over data and access
- No third-party involved
- Requires server setup and maintenance

## Best Practices

1. **Use unique topic names** with random suffixes to avoid collisions
2. **Enable authentication** if notifications contain sensitive information
3. **Test regularly** to ensure notifications are working
4. **Adjust priority** based on importance (use urgent sparingly)
5. **Disable unnecessary events** to reduce notification noise
6. **Self-host** if you need full privacy and control

## Resources

- [Ntfy Documentation](https://docs.ntfy.sh)
- [Ntfy GitHub](https://github.com/binwiederhier/ntfy)
- [Self-hosting Guide](https://docs.ntfy.sh/install/)
- [API Reference](https://docs.ntfy.sh/publish/)

## Support

For IdeaListed-specific notification issues, check:
- Server logs: Browser console when saving settings
- Test notification: Use TEST button in NTFY settings tab
- Database: Verify settings saved in `settings` table (key: `ntfy_config`)

For ntfy server/app issues, consult:
- [Ntfy troubleshooting guide](https://docs.ntfy.sh/troubleshoot/)
- [GitHub Issues](https://github.com/binwiederhier/ntfy/issues)
