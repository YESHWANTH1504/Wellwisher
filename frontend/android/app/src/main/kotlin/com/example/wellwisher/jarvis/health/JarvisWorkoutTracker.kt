package com.example.wellwisher.jarvis.health

import android.content.Context
import android.util.Log
import androidx.health.connect.client.records.ExerciseSessionRecord
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * JarvisWorkoutTracker
 * On-device workout tracker maintaining native exercise session state,
 * duration calculation, and exporting completed workouts directly to Health Connect.
 * 
 * Strict architectural rule:
 * Tracking happens on-device; writes ExerciseSessionRecord directly to Health Connect.
 * Never fabricates calories or heart rate.
 */
object JarvisWorkoutTracker {
    private const val TAG = "JarvisWorkoutTracker"

    var isTracking: Boolean = false
        private set
    var currentExerciseType: String = "walking"
        private set
    var startTime: Instant? = null
        private set

    fun startWorkout(type: String): Map<String, Any?> {
        currentExerciseType = type.lowercase().trim()
        startTime = Instant.now()
        isTracking = true
        Log.i(TAG, "Started workout tracking: type=$currentExerciseType at=$startTime")
        return mapOf(
            "active" to true,
            "exerciseType" to currentExerciseType,
            "startTime" to startTime.toString()
        )
    }

    suspend fun stopWorkout(context: Context): Map<String, Any?> {
        if (!isTracking || startTime == null) {
            return mapOf(
                "success" to false,
                "savedToHealthConnect" to false,
                "message" to "No active workout is currently being tracked."
            )
        }

        val start = startTime!!
        val end = Instant.now()
        val durationMins = ChronoUnit.MINUTES.between(start, end)
        val durationSecs = ChronoUnit.SECONDS.between(start, end)
        val exerciseTypeStr = currentExerciseType

        isTracking = false
        startTime = null

        val typeCode = when (exerciseTypeStr) {
            "running", "run" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
            "cycling", "biking", "bike" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
            else -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
        }

        val manager = HealthConnectManager(context)
        val writeResult = manager.writeExerciseSession(
            title = "${exerciseTypeStr.replaceFirstChar { it.uppercase() }} Workout",
            exerciseType = typeCode,
            startTime = start,
            endTime = end
        )

        val saved = writeResult["success"] == true
        Log.i(TAG, "Stopped workout: type=$exerciseTypeStr duration=${durationMins}m savedToHealthConnect=$saved")

        return mapOf(
            "success" to true,
            "savedToHealthConnect" to saved,
            "exerciseType" to exerciseTypeStr,
            "durationMinutes" to durationMins,
            "durationSeconds" to durationSecs,
            "startTime" to start.toString(),
            "endTime" to end.toString(),
            "healthConnectResult" to writeResult
        )
    }

    fun getStatus(): Map<String, Any?> {
        return mapOf(
            "isTracking" to isTracking,
            "exerciseType" to currentExerciseType,
            "startTime" to (startTime?.toString() ?: ""),
            "durationSeconds" to if (startTime != null) ChronoUnit.SECONDS.between(startTime, Instant.now()) else 0
        )
    }
}
