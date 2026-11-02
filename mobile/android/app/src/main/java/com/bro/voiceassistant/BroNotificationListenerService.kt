package com.bro.voiceassistant

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class BroNotificationListenerService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d("BroNotificationService", "Notification listener connected successfully")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        try {
            val packageName = sbn.packageName ?: return
            // Ignore system UI noise
            if (packageName == "android" || packageName == "com.android.systemui") return

            val extras = sbn.notification.extras ?: return
            val title = extras.getString("android.title") ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""

            Log.d("BroNotificationService", "Notification from $packageName: $title - $text")
            AssiBridgeModule.onNotificationPosted(packageName, title, text)
        } catch (e: Exception) {
            Log.e("BroNotificationService", "Error parsing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
