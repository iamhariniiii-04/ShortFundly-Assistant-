package com.shortfundly.voiceassistant

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONArray

class BroBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BroBridge"

    @ReactMethod
    fun getBatteryLevel(promise: Promise) {
        try {
            val batteryManager = reactApplicationContext.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            var level = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1

            var isCharging = false
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = reactApplicationContext.registerReceiver(null, filter)

            if (batteryStatus != null) {
                if (level < 0) {
                    val rawLevel = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                    val scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                    if (rawLevel >= 0 && scale > 0) {
                        level = (rawLevel * 100) / scale
                    }
                }
                val status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
            }

            if (level < 0) level = 100

            val result: WritableMap = WritableNativeMap()
            result.putInt("percentage", level)
            result.putBoolean("isCharging", isCharging)
            result.putBoolean("success", true)
            promise.resolve(result)
        } catch (e: Exception) {
            val fallback: WritableMap = WritableNativeMap()
            fallback.putInt("percentage", 100)
            fallback.putBoolean("isCharging", false)
            fallback.putBoolean("success", true)
            promise.resolve(fallback)
        }
    }

    @ReactMethod
    fun getCapturedNotifications(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("BroNotifications", Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("unread_list", "[]") ?: "[]"
            val jsonArray = JSONArray(jsonStr)

            val array: WritableArray = WritableNativeArray()
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                val map: WritableMap = WritableNativeMap()
                map.putString("id", item.optString("id"))
                map.putString("appName", item.optString("appName"))
                map.putString("sender", item.optString("sender"))
                map.putString("text", item.optString("text"))
                map.putDouble("timestamp", item.optDouble("timestamp"))
                map.putBoolean("read", item.optBoolean("read"))
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.resolve(WritableNativeArray())
        }
    }

    @ReactMethod
    fun clearCapturedNotifications(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("BroNotifications", Context.MODE_PRIVATE)
            prefs.edit().putString("unread_list", "[]").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun directCall(phoneNumber: String, promise: Promise) {
        try {
            val clean = phoneNumber.replace(Regex("[^0-9+]"), "")
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$clean")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun lockPhone(promise: Promise) {
        try {
            val deviceManager = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            if (deviceManager != null) {
                try {
                    deviceManager.lockNow()
                    promise.resolve(true)
                    return
                } catch (e: Exception) {}
            }

            // Fallback: Go to home screen and turn off / dim
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(homeIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
