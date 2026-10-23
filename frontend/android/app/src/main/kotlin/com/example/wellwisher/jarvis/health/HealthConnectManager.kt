@file:OptIn(androidx.health.connect.client.feature.ExperimentalFeatureAvailabilityApi::class)

package com.example.wellwisher.jarvis.health

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * HealthConnectManager
 * Authoritative native Android Health Connect provider for WellWisher / JARVIS.
 * 
 * Architectural Rules:
 * - Health Connect is the authoritative single source of truth for live device health measurements.
 * - Deduplicates cumulative metrics (e.g. steps, distance, calories) via Health Connect Aggregation API.
 * - ZERO FABRICATION: If data is unavailable, unpermitted, or unrecorded, returns structured semantic codes.
 * - Never converts missing measurements into zero (no 0 steps, 0 BPM, 0/0 BP, 0h sleep when no data exists).
 * - Distinguishes ACTIVE calories from TOTAL calories.
 * - Preserves user local calendar dates (never shifting dates across timezones).
 */
class HealthConnectManager(private val context: Context) {

    companion object {
        private const val TAG = "HealthConnectManager"

        val PERMISSIONS = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(RestingHeartRateRecord::class),
            HealthPermission.getReadPermission(BloodPressureRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getWritePermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class)
        )
    }

    private val healthConnectClient: HealthConnectClient? by lazy {
        try {
            if (isHealthConnectAvailable()) {
                HealthConnectClient.getOrCreate(context)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize HealthConnectClient", e)
            null
        }
    }

    /**
     * Check if Health Connect is available on the device
     */
    fun isHealthConnectAvailable(): Boolean {
        return try {
            val status = HealthConnectClient.getSdkStatus(context)
            status == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Exception) {
            Log.w(TAG, "Health Connect SDK status check failed: ${e.message}")
            false
        }
    }

    /**
     * Check which health permissions are currently granted
     */
    suspend fun checkPermissions(): Map<String, Boolean> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext emptyMap()
        try {
            val granted = client.permissionController.getGrantedPermissions()
            val hasBgPerm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ContextCompat.checkSelfPermission(
                    context,
                    "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"
                ) == PackageManager.PERMISSION_GRANTED
            } else false

            mapOf(
                "READ_STEPS" to granted.contains(HealthPermission.getReadPermission(StepsRecord::class)),
                "READ_ACTIVE_CALORIES" to granted.contains(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)),
                "READ_TOTAL_CALORIES" to granted.contains(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)),
                "READ_HEART_RATE" to granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class)),
                "READ_RESTING_HEART_RATE" to granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)),
                "READ_BLOOD_PRESSURE" to granted.contains(HealthPermission.getReadPermission(BloodPressureRecord::class)),
                "READ_SLEEP" to granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)),
                "READ_DISTANCE" to granted.contains(HealthPermission.getReadPermission(DistanceRecord::class)),
                "READ_EXERCISE" to granted.contains(HealthPermission.getReadPermission(ExerciseSessionRecord::class)),
                "READ_WEIGHT" to granted.contains(HealthPermission.getReadPermission(WeightRecord::class)),
                "READ_BACKGROUND" to hasBgPerm
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check health permissions", e)
            emptyMap()
        }
    }

    /**
     * Check background read capability on the current Android OS
     */
    fun getBackgroundHealthCapability(): Map<String, Any> {
        val isAvailable = isHealthConnectAvailable()
        var bgSupported = false
        var bgPermGranted = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            bgSupported = try {
                val features = healthConnectClient?.features
                features?.getFeatureStatus(
                    HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
                ) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
            } catch (_: Exception) {
                false
            }

            bgPermGranted = ContextCompat.checkSelfPermission(
                context,
                "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"
            ) == PackageManager.PERMISSION_GRANTED
        }

        return mapOf(
            "supported" to bgSupported,
            "permissionGranted" to bgPermGranted,
            "sdkAvailable" to isAvailable,
            "message" to if (bgSupported) {
                if (bgPermGranted) "Background health reads active" else "Background permission not granted"
            } else "Background health reads not supported on this platform"
        )
    }

    // =========================================================================
    // 1. STEPS (Aggregation & Deduplication)
    // =========================================================================

    suspend fun getStepsToday(): Map<String, Any?> = getStepsForDate(null)

    suspend fun getStepsForDate(dateStr: String?): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("steps", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_STEPS"] != true) {
            return@withContext permissionDeniedResult("steps")
        }

        try {
            val zoneId = ZoneId.systemDefault()
            val targetDate = if (dateStr.isNullOrBlank()) LocalDate.now(zoneId) else LocalDate.parse(dateStr)
            val startOfDay = targetDate.atStartOfDay(zoneId).toInstant()
            val endOfDay = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant()
            val boundedEnd = if (targetDate == LocalDate.now(zoneId)) Instant.now() else endOfDay

            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, boundedEnd)
                )
            )

            val stepCount = response[StepsRecord.COUNT_TOTAL]
            if (stepCount != null) {
                val origins = response.dataOrigins.map { it.packageName }
                mapOf(
                    "available" to true,
                    "metric" to "steps",
                    "value" to stepCount,
                    "unit" to "steps",
                    "source" to if (origins.isNotEmpty()) origins.joinToString(", ") else "Health Connect",
                    "date" to targetDate.toString(),
                    "timestamp" to boundedEnd.toString()
                )
            } else {
                unavailableResult("steps", "NO_DATA", "No steps recorded in Health Connect for $targetDate.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying steps: ${e.message}", e)
            unavailableResult("steps", "ERROR", e.message)
        }
    }

    suspend fun getStepsRange(startDateStr: String, endDateStr: String): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("steps", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_STEPS"] != true) return@withContext permissionDeniedResult("steps")

        try {
            val zoneId = ZoneId.systemDefault()
            val startDate = LocalDate.parse(startDateStr)
            val endDate = LocalDate.parse(endDateStr)
            val start = startDate.atStartOfDay(zoneId).toInstant()
            val end = endDate.plusDays(1).atStartOfDay(zoneId).toInstant()

            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )

            val total = response[StepsRecord.COUNT_TOTAL]
            if (total != null) {
                val days = ChronoUnit.DAYS.between(startDate, endDate) + 1
                mapOf(
                    "available" to true,
                    "metric" to "steps",
                    "totalSteps" to total,
                    "averageSteps" to (total / days.coerceAtLeast(1)),
                    "startDate" to startDateStr,
                    "endDate" to endDateStr,
                    "source" to "Health Connect"
                )
            } else {
                unavailableResult("steps", "NO_DATA", "No step records in specified range.")
            }
        } catch (e: Exception) {
            unavailableResult("steps", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 2. CALORIES (Active vs Total distinction)
    // =========================================================================

    suspend fun getActiveCaloriesToday(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("active_calories", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_ACTIVE_CALORIES"] != true) return@withContext permissionDeniedResult("active_calories")

        try {
            val zoneId = ZoneId.systemDefault()
            val startOfDay = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
            val now = Instant.now()

            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, now)
                )
            )

            val calories = response[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
            if (calories != null) {
                mapOf(
                    "available" to true,
                    "metric" to "active_calories",
                    "value" to calories.toLong(),
                    "unit" to "kcal",
                    "source" to "Health Connect",
                    "timestamp" to now.toString()
                )
            } else {
                unavailableResult("active_calories", "NO_DATA", "No active calories recorded for today.")
            }
        } catch (e: Exception) {
            unavailableResult("active_calories", "ERROR", e.message)
        }
    }

    suspend fun getTotalCaloriesToday(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("total_calories", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_TOTAL_CALORIES"] != true) return@withContext permissionDeniedResult("total_calories")

        try {
            val zoneId = ZoneId.systemDefault()
            val startOfDay = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
            val now = Instant.now()

            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, now)
                )
            )

            val calories = response[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
            if (calories != null) {
                mapOf(
                    "available" to true,
                    "metric" to "total_calories",
                    "value" to calories.toLong(),
                    "unit" to "kcal",
                    "source" to "Health Connect",
                    "timestamp" to now.toString()
                )
            } else {
                unavailableResult("total_calories", "NO_DATA", "No total calories recorded for today.")
            }
        } catch (e: Exception) {
            unavailableResult("total_calories", "ERROR", e.message)
        }
    }

    suspend fun getCaloriesForDate(dateStr: String?): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("calories", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()

        try {
            val zoneId = ZoneId.systemDefault()
            val targetDate = if (dateStr.isNullOrBlank()) LocalDate.now(zoneId) else LocalDate.parse(dateStr)
            val startOfDay = targetDate.atStartOfDay(zoneId).toInstant()
            val endOfDay = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant()
            val boundedEnd = if (targetDate == LocalDate.now(zoneId)) Instant.now() else endOfDay

            var activeCal: Long? = null
            var totalCal: Long? = null

            if (perms["READ_ACTIVE_CALORIES"] == true) {
                val actResp = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(startOfDay, boundedEnd)
                    )
                )
                activeCal = actResp[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories?.toLong()
            }

            if (perms["READ_TOTAL_CALORIES"] == true) {
                val totResp = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(startOfDay, boundedEnd)
                    )
                )
                totalCal = totResp[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories?.toLong()
            }

            val hasAny = activeCal != null || totalCal != null
            if (hasAny) {
                mapOf(
                    "available" to true,
                    "metric" to "calories",
                    "activeCalories" to activeCal,
                    "totalCalories" to totalCal,
                    "unit" to "kcal",
                    "date" to targetDate.toString(),
                    "source" to "Health Connect"
                )
            } else {
                unavailableResult("calories", "NO_DATA", "No calorie measurements recorded for $targetDate.")
            }
        } catch (e: Exception) {
            unavailableResult("calories", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 3. HEART RATE & RESTING HEART RATE
    // =========================================================================

    suspend fun getLatestHeartRate(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("heart_rate", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_HEART_RATE"] != true) return@withContext permissionDeniedResult("heart_rate")

        try {
            val now = Instant.now()
            val past24Hours = now.minus(24, ChronoUnit.HOURS)

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(past24Hours, now)
                )
            ).records

            val latestRecord = records.maxByOrNull { it.endTime }
            val latestSample = latestRecord?.samples?.lastOrNull()

            if (latestSample != null) {
                val src = latestRecord.metadata.dataOrigin.packageName
                mapOf(
                    "available" to true,
                    "metric" to "heart_rate",
                    "value" to latestSample.beatsPerMinute,
                    "unit" to "bpm",
                    "timestamp" to latestSample.time.toString(),
                    "source" to if (src.isNotBlank()) src else "Health Connect"
                )
            } else {
                unavailableResult("heart_rate", "NO_DATA", "No recent heart-rate readings recorded in Health Connect.")
            }
        } catch (e: Exception) {
            unavailableResult("heart_rate", "ERROR", e.message)
        }
    }

    suspend fun getRestingHeartRate(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("resting_heart_rate", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_RESTING_HEART_RATE"] != true) return@withContext permissionDeniedResult("resting_heart_rate")

        try {
            val now = Instant.now()
            val past48Hours = now.minus(48, ChronoUnit.HOURS)

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = RestingHeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(past48Hours, now)
                )
            ).records

            val latest = records.maxByOrNull { it.time }
            if (latest != null) {
                val src = latest.metadata.dataOrigin.packageName
                mapOf(
                    "available" to true,
                    "metric" to "resting_heart_rate",
                    "value" to latest.beatsPerMinute,
                    "unit" to "bpm",
                    "timestamp" to latest.time.toString(),
                    "source" to if (src.isNotBlank()) src else "Health Connect"
                )
            } else {
                unavailableResult("resting_heart_rate", "NO_DATA", "No resting heart-rate reading recorded.")
            }
        } catch (e: Exception) {
            unavailableResult("resting_heart_rate", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 4. BLOOD PRESSURE (Systolic/Diastolic — NEVER ESTIMATED)
    // =========================================================================

    suspend fun getLatestBloodPressure(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("blood_pressure", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_BLOOD_PRESSURE"] != true) return@withContext permissionDeniedResult("blood_pressure")

        try {
            val now = Instant.now()
            val past7Days = now.minus(7, ChronoUnit.DAYS)

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = BloodPressureRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(past7Days, now)
                )
            ).records

            val latest = records.maxByOrNull { it.time }
            if (latest != null) {
                val systolic = latest.systolic.inMillimetersOfMercury.toInt()
                val diastolic = latest.diastolic.inMillimetersOfMercury.toInt()
                val src = latest.metadata.dataOrigin.packageName

                mapOf(
                    "available" to true,
                    "metric" to "blood_pressure",
                    "systolic" to systolic,
                    "diastolic" to diastolic,
                    "formatted" to "$systolic/$diastolic mmHg",
                    "unit" to "mmHg",
                    "timestamp" to latest.time.toString(),
                    "source" to if (src.isNotBlank()) src else "Health Connect"
                )
            } else {
                unavailableResult("blood_pressure", "NO_DATA", "No blood-pressure data recorded in Health Connect.")
            }
        } catch (e: Exception) {
            unavailableResult("blood_pressure", "ERROR", e.message)
        }
    }

    suspend fun getBloodPressureRange(startDateStr: String, endDateStr: String): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("blood_pressure", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_BLOOD_PRESSURE"] != true) return@withContext permissionDeniedResult("blood_pressure")

        try {
            val zoneId = ZoneId.systemDefault()
            val start = LocalDate.parse(startDateStr).atStartOfDay(zoneId).toInstant()
            val end = LocalDate.parse(endDateStr).plusDays(1).atStartOfDay(zoneId).toInstant()

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = BloodPressureRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            ).records

            val list = records.map { r ->
                mapOf(
                    "systolic" to r.systolic.inMillimetersOfMercury.toInt(),
                    "diastolic" to r.diastolic.inMillimetersOfMercury.toInt(),
                    "timestamp" to r.time.toString(),
                    "source" to r.metadata.dataOrigin.packageName
                )
            }

            mapOf(
                "available" to list.isNotEmpty(),
                "metric" to "blood_pressure",
                "readings" to list,
                "count" to list.size
            )
        } catch (e: Exception) {
            unavailableResult("blood_pressure", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 5. SLEEP (Duration & Sessions)
    // =========================================================================

    suspend fun getSleepSummary(dateStr: String? = null): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("sleep", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_SLEEP"] != true) return@withContext permissionDeniedResult("sleep")

        try {
            val zoneId = ZoneId.systemDefault()
            val targetDate = if (dateStr.isNullOrBlank()) LocalDate.now(zoneId) else LocalDate.parse(dateStr)
            val startWindow = targetDate.minusDays(1).atTime(18, 0).atZone(zoneId).toInstant()
            val endWindow = targetDate.atTime(18, 0).atZone(zoneId).toInstant()

            val sessions = client.readRecords(
                ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startWindow, endWindow)
                )
            ).records

            val session = sessions.maxByOrNull { ChronoUnit.MINUTES.between(it.startTime, it.endTime) }
            if (session != null) {
                val durationMinutes = ChronoUnit.MINUTES.between(session.startTime, session.endTime)
                val hours = durationMinutes / 60
                val mins = durationMinutes % 60
                val formatted = "${hours}h ${mins}m"
                val src = session.metadata.dataOrigin.packageName

                mapOf(
                    "available" to true,
                    "metric" to "sleep",
                    "durationHours" to (durationMinutes.toDouble() / 60.0),
                    "totalSleepMinutes" to durationMinutes,
                    "formattedDuration" to formatted,
                    "startTime" to session.startTime.toString(),
                    "endTime" to session.endTime.toString(),
                    "date" to targetDate.toString(),
                    "source" to if (src.isNotBlank()) src else "Health Connect"
                )
            } else {
                unavailableResult("sleep", "NO_DATA", "No sleep records found for $targetDate.")
            }
        } catch (e: Exception) {
            unavailableResult("sleep", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 6. DISTANCE
    // =========================================================================

    suspend fun getDistanceToday(): Map<String, Any?> = getDistanceForDate(null)

    suspend fun getDistanceForDate(dateStr: String?): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("distance", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_DISTANCE"] != true) return@withContext permissionDeniedResult("distance")

        try {
            val zoneId = ZoneId.systemDefault()
            val targetDate = if (dateStr.isNullOrBlank()) LocalDate.now(zoneId) else LocalDate.parse(dateStr)
            val startOfDay = targetDate.atStartOfDay(zoneId).toInstant()
            val endOfDay = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant()
            val boundedEnd = if (targetDate == LocalDate.now(zoneId)) Instant.now() else endOfDay

            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(DistanceRecord.DISTANCE_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, boundedEnd)
                )
            )

            val length = response[DistanceRecord.DISTANCE_TOTAL]
            if (length != null) {
                val meters = length.inMeters
                val km = length.inKilometers
                val formattedKm = String.format(java.util.Locale.US, "%.2f km", km)

                mapOf(
                    "available" to true,
                    "metric" to "distance",
                    "meters" to meters.toLong(),
                    "kilometers" to km,
                    "formatted" to formattedKm,
                    "unit" to "km",
                    "date" to targetDate.toString(),
                    "source" to "Health Connect"
                )
            } else {
                unavailableResult("distance", "NO_DATA", "No distance data recorded for $targetDate.")
            }
        } catch (e: Exception) {
            unavailableResult("distance", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 7. WORKOUTS (ExerciseSessionRecord)
    // =========================================================================

    suspend fun getWorkouts(dateStr: String? = null): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("workouts", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_EXERCISE"] != true) return@withContext permissionDeniedResult("workouts")

        try {
            val zoneId = ZoneId.systemDefault()
            val targetDate = if (dateStr.isNullOrBlank()) LocalDate.now(zoneId) else LocalDate.parse(dateStr)
            val startOfDay = targetDate.atStartOfDay(zoneId).toInstant()
            val endOfDay = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant()
            val boundedEnd = if (targetDate == LocalDate.now(zoneId)) Instant.now() else endOfDay

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, boundedEnd)
                )
            ).records

            val list = records.map { ex ->
                val durationMinutes = ChronoUnit.MINUTES.between(ex.startTime, ex.endTime)
                mapOf(
                    "title" to (ex.title ?: "Workout"),
                    "exerciseType" to ex.exerciseType,
                    "durationMinutes" to durationMinutes,
                    "startTime" to ex.startTime.toString(),
                    "endTime" to ex.endTime.toString(),
                    "source" to ex.metadata.dataOrigin.packageName
                )
            }

            mapOf(
                "available" to list.isNotEmpty(),
                "metric" to "workouts",
                "count" to list.size,
                "workouts" to list,
                "date" to targetDate.toString()
            )
        } catch (e: Exception) {
            unavailableResult("workouts", "ERROR", e.message)
        }
    }

    suspend fun writeExerciseSession(
        title: String,
        exerciseType: Int,
        startTime: Instant,
        endTime: Instant,
        notes: String? = null
    ): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("workout_write", "HEALTH_NOT_AVAILABLE")
        try {
            val sessionRecord = ExerciseSessionRecord(
                startTime = startTime,
                startZoneOffset = ZoneId.systemDefault().rules.getOffset(startTime),
                endTime = endTime,
                endZoneOffset = ZoneId.systemDefault().rules.getOffset(endTime),
                exerciseType = exerciseType,
                title = title,
                notes = notes
            )
            val response = client.insertRecords(listOf(sessionRecord))
            mapOf(
                "success" to true,
                "recordIds" to response.recordIdsList,
                "title" to title,
                "durationMinutes" to ChronoUnit.MINUTES.between(startTime, endTime)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error writing ExerciseSessionRecord: ${e.message}", e)
            mapOf(
                "success" to false,
                "error" to (e.message ?: "Failed to write workout session to Health Connect")
            )
        }
    }

    // =========================================================================
    // 8. WEIGHT (WeightRecord)
    // =========================================================================

    suspend fun getLatestWeight(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("weight", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_WEIGHT"] != true) return@withContext permissionDeniedResult("weight")

        try {
            val now = Instant.now()
            val past30Days = now.minus(30, ChronoUnit.DAYS)

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = WeightRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(past30Days, now)
                )
            ).records

            val latest = records.maxByOrNull { it.time }
            if (latest != null) {
                val kg = latest.weight.inKilograms
                val formatted = String.format(java.util.Locale.US, "%.1f kg", kg)
                val src = latest.metadata.dataOrigin.packageName

                mapOf(
                    "available" to true,
                    "metric" to "weight",
                    "value" to kg,
                    "formatted" to formatted,
                    "unit" to "kg",
                    "timestamp" to latest.time.toString(),
                    "source" to if (src.isNotBlank()) src else "Health Connect"
                )
            } else {
                unavailableResult("weight", "NO_DATA", "No recent weight measurement recorded in Health Connect.")
            }
        } catch (e: Exception) {
            unavailableResult("weight", "ERROR", e.message)
        }
    }

    suspend fun getWeightHistory(): Map<String, Any?> = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext unavailableResult("weight", "HEALTH_NOT_AVAILABLE")
        val perms = checkPermissions()
        if (perms["READ_WEIGHT"] != true) return@withContext permissionDeniedResult("weight")

        try {
            val now = Instant.now()
            val past90Days = now.minus(90, ChronoUnit.DAYS)

            val records = client.readRecords(
                ReadRecordsRequest(
                    recordType = WeightRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(past90Days, now)
                )
            ).records.sortedBy { it.time }

            val list = records.map {
                mapOf(
                    "weight" to it.weight.inKilograms,
                    "timestamp" to it.time.toString()
                )
            }

            mapOf(
                "available" to list.isNotEmpty(),
                "metric" to "weight",
                "history" to list,
                "count" to list.size
            )
        } catch (e: Exception) {
            unavailableResult("weight", "ERROR", e.message)
        }
    }

    // =========================================================================
    // 9. FULL DAILY SNAPSHOT (Aggregates real values for specified date)
    // =========================================================================

    suspend fun getFullDailySnapshot(dateStr: String? = null): Map<String, Any?> = withContext(Dispatchers.IO) {
        val steps = getStepsForDate(dateStr)
        val calories = getCaloriesForDate(dateStr)
        val heart = getLatestHeartRate()
        val restingHeart = getRestingHeartRate()
        val bp = getLatestBloodPressure()
        val sleep = getSleepSummary(dateStr)
        val distance = getDistanceForDate(dateStr)
        val workouts = getWorkouts(dateStr)
        val weight = getLatestWeight()

        mapOf(
            "date" to (dateStr ?: LocalDate.now().toString()),
            "steps" to steps,
            "calories" to calories,
            "heartRate" to heart,
            "restingHeartRate" to restingHeart,
            "bloodPressure" to bp,
            "sleep" to sleep,
            "distance" to distance,
            "workouts" to workouts,
            "weight" to weight,
            "source" to "Health Connect"
        )
    }

    private fun unavailableResult(metric: String, reason: String, message: String? = null): Map<String, Any?> {
        return mapOf(
            "available" to false,
            "metric" to metric,
            "reason" to reason,
            "message" to (message ?: when (reason) {
                "HEALTH_NOT_AVAILABLE" -> "Health Connect isn't available on this device."
                "PERMISSION_DENIED" -> "Permission to access your $metric data has not been granted."
                "NO_DATA" -> "I don't currently have $metric recorded in Health Connect."
                else -> "Health data currently unavailable."
            })
        )
    }

    private fun permissionDeniedResult(metric: String): Map<String, Any?> {
        return unavailableResult(metric, "PERMISSION_DENIED", "Health Connect permission for $metric is not granted.")
    }
}
