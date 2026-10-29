package com.shortfundly.voiceassistant

import android.app.Notification
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.speech.tts.TextToSpeech
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class BroNotificationService : NotificationListenerService(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    override fun onCreate() {
        super.onCreate()
        try {
            tts = TextToSpeech(applicationContext, this)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.ENGLISH
            isTtsReady = true
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        // Skip our own notifications
        if (packageName == applicationContext.packageName) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        if (title.isEmpty() && text.isEmpty()) return

        // Map package to app name
        val appName = when {
            packageName.contains("whatsapp", ignoreCase = true) -> "WhatsApp"
            packageName.contains("messaging", ignoreCase = true) || packageName.contains("mms", ignoreCase = true) -> "Messages"
            packageName.contains("dialer", ignoreCase = true) || packageName.contains("telecom", ignoreCase = true) -> "Phone"
            packageName.contains("instagram", ignoreCase = true) -> "Instagram"
            packageName.contains("gmail", ignoreCase = true) -> "Gmail"
            else -> null
        } ?: return

        // Save notification to shared preferences
        saveNotification(appName, title, text)

        // If screen is off, alert aloud for visually impaired user
        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isScreenOn = powerManager?.isInteractive ?: true

        if (!isScreenOn && isTtsReady) {
            val alertSpeech = "New $appName from $title: $text"
            tts?.speak(alertSpeech, TextToSpeech.QUEUE_FLUSH, null, "notif_${System.currentTimeMillis()}")
        }
    }

    private fun saveNotification(appName: String, sender: String, text: String) {
        try {
            val prefs = getSharedPreferences("BroNotifications", Context.MODE_PRIVATE)
            val existing = prefs.getString("unread_list", "[]") ?: "[]"
            val jsonArray = JSONArray(existing)

            val item = JSONObject().apply {
                put("id", System.currentTimeMillis().toString())
                put("appName", appName)
                put("sender", sender)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
                put("read", false)
            }

            val newArray = JSONArray()
            newArray.put(item)
            for (i in 0 until jsonArray.length().coerceAtMost(30)) {
                newArray.put(jsonArray.get(i))
            }

            prefs.edit().putString("unread_list", newArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {}
        super.onDestroy()
    }
}
