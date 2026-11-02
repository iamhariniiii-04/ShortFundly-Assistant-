package com.bro.voiceassistant

import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AssiBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AssiBridge"
        private var instance: AssiBridgeModule? = null

        fun onNotificationPosted(packageName: String, title: String, text: String) {
            instance?.let { bridge ->
                try {
                    val params = Arguments.createMap().apply {
                        putString("packageName", packageName)
                        putString("title", title)
                        putString("text", text)
                        putDouble("timestamp", System.currentTimeMillis().toDouble())
                    }
                    bridge.sendEvent("onAssiNotification", params)
                } catch (e: Exception) {
                    Log.e("AssiBridge", "Error emitting notification event", e)
                }
            }
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = NAME

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(NAME, "Failed to send event: $eventName", e)
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun searchContact(query: String, promise: Promise) {
        val results = Arguments.createArray()
        try {
            val cr = reactContext.contentResolver
            val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
            val projection = arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            )
            val selection = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ? OR ${ContactsContract.CommonDataKinds.Phone.NUMBER} LIKE ?"
            val selectionArgs = arrayOf("%$query%", "%$query%")

            val cursor: Cursor? = cr.query(uri, projection, selection, selectionArgs, null)
            cursor?.use {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                var count = 0
                while (it.moveToNext() && count < 10) {
                    val name = if (nameIdx >= 0) it.getString(nameIdx) else ""
                    val number = if (numIdx >= 0) it.getString(numIdx) else ""
                    if (name.isNotEmpty() || number.isNotEmpty()) {
                        val contactMap = Arguments.createMap().apply {
                            putString("name", name)
                            putString("phoneNumber", number.replace("[^0-9+]".toRegex(), ""))
                        }
                        results.pushMap(contactMap)
                        count++
                    }
                }
            }
            promise.resolve(results)
        } catch (e: Exception) {
            Log.e(NAME, "Error searching contacts: ${e.message}")
            promise.resolve(results)
        }
    }

    @ReactMethod
    fun makeDirectCall(phoneNumber: String, promise: Promise) {
        try {
            val cleanNumber = phoneNumber.replace("[^0-9+]".toRegex(), "")
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$cleanNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            // Fallback to ACTION_DIAL if CALL_PHONE permission is denied or restricted
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:$phoneNumber")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(dialIntent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("CALL_ERROR", err.message, err)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep for RN event emitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep for RN event emitter compatibility
    }
}
