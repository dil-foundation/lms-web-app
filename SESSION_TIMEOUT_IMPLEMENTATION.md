# Session Timeout Implementation

## Overview

This implementation provides automatic session timeout functionality based on user inactivity. Users are automatically logged out after a configurable period of inactivity, with a warning shown 5 minutes before the session expires.

## Features

### ✅ Automatic Session Timeout
- **Configurable Timeout**: Set via admin security settings (15 minutes, 30 minutes, or 1 hour)
- **Inactivity Detection**: Tracks user activity through mouse, keyboard, and touch events
- **Automatic Logout**: Logs out users when timeout is exceeded
- **Database Integration**: Updates session activity in the database

### ✅ User Experience
- **Warning System**: Shows a 5-minute warning before session expires
- **Session Extension**: Users can extend their session from the warning dialog
- **Visual Countdown**: Real-time countdown timer in the warning dialog
- **Toast Notifications**: Clear feedback when session expires or is extended

### ✅ Security Features
- **Activity Tracking**: Monitors user interactions across the entire application
- **Database Logging**: Records session activity for audit purposes
- **Graceful Handling**: Proper cleanup of timeouts and event listeners
- **Cross-Tab Support**: Works across multiple browser tabs

## Implementation Details

### Core Components

1. **`useSessionTimeout` Hook** (`src/hooks/useSessionTimeout.ts`)
   - Manages session timeout logic
   - Tracks user activity
   - Handles warning display and session extension
   - Integrates with security settings

2. **`SessionTimeoutWarning` Component** (`src/components/SessionTimeoutWarning.tsx`)
   - Displays warning dialog with countdown
   - Provides session extension functionality
   - Handles user dismissal

3. **Security Settings Integration** (`src/components/admin/AdminSecurity.tsx`)
   - Allows admins to configure session timeout duration
   - Options: 15 minutes, 30 minutes, 1 hour

### Activity Detection

The system monitors the following user activities:
- Mouse movements and clicks
- Keyboard input
- Touch events (mobile)
- Scrolling
- Window focus changes

### Timeout Configuration

Session timeout is configured through the admin security panel:
- Navigate to Admin Dashboard → Security
- Set "Session Timeout (minutes)" to desired value
- Changes take effect immediately for new sessions

### Warning System

- **Warning Trigger**: 5 minutes before session expires
- **Countdown Display**: Real-time countdown in warning dialog
- **Extension Option**: Users can extend session with one click
- **Dismissal**: Users can dismiss warning (session will still expire)

## Usage

### For Users
1. **Normal Usage**: No action required - system works automatically
2. **Warning Display**: When session is about to expire, a warning dialog appears
3. **Session Extension**: Click "Extend Session" to continue working
4. **Automatic Logout**: If no action is taken, user is logged out automatically

### For Administrators
1. **Configure Timeout**: Set desired timeout in Security settings
2. **Monitor Activity**: View active sessions in Security overview
3. **Audit Logs**: Check access logs for session-related events

## Technical Implementation

### Database Integration
- Session activity is logged to `user_sessions` table
- Activity updates occur every 5 minutes
- Session timeout settings stored in `security_settings` table

### Event Handling
- Activity events are captured at the document level
- Timeout checking occurs every 30 seconds
- Warning system triggers 5 minutes before expiration

### State Management
- Uses React hooks for state management
- Proper cleanup of intervals and event listeners
- Integration with existing auth context

## Security Considerations

1. **Server-Side Validation**: Session timeout is also enforced on the server
2. **Database Logging**: All session activities are logged for audit
3. **Graceful Degradation**: Falls back to default timeout if settings can't be loaded
4. **Cross-Tab Coordination**: Handles multiple browser tabs correctly

## Configuration Options

### Session Timeout Durations
- **15 minutes**: Quick timeout for high-security environments
- **30 minutes**: Standard timeout for most use cases
- **1 hour**: Extended timeout for less critical applications

### Warning Settings
- **Warning Time**: 5 minutes before expiration (configurable in code)
- **Check Frequency**: Every 30 seconds (configurable in code)
- **Activity Update**: Every 5 minutes (configurable in code)

## Troubleshooting

### Common Issues
1. **Session expires too quickly**: Check admin security settings
2. **Warning doesn't appear**: Verify user activity detection is working
3. **Extension doesn't work**: Check database connectivity and session service

### Debug Information
- Console logs show session timeout events
- Network tab shows session activity updates
- Database logs show session state changes

## Future Enhancements

1. **Custom Warning Times**: Allow configuration of warning duration
2. **Activity Thresholds**: More sophisticated activity detection
3. **Session Recovery**: Allow session recovery after timeout
4. **Analytics**: Track session timeout patterns and user behavior
