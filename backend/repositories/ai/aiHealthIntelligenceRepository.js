const pool = require('../../config/db');

class AiHealthIntelligenceRepository {
  // ===================== HEALTH TRENDS =====================
  static async saveTrend(userId, trend) {
    if (!userId || !trend || !trend.metricName) {
      throw new Error('userId and metricName are required to save health trend.');
    }

    const id = trend.id || `ht_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sourceDocs = Array.isArray(trend.sourceDocumentIds) ? JSON.stringify(trend.sourceDocumentIds) : (trend.sourceDocumentIds || '[]');

    await pool.query(
      `INSERT INTO ai_health_trends (
        id, user_id, metric_name, previous_value, latest_value, unit,
        previous_date, latest_date, change_value, change_percent, trend_direction,
        confidence, source_document_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        previous_value = VALUES(previous_value),
        latest_value = VALUES(latest_value),
        unit = VALUES(unit),
        previous_date = VALUES(previous_date),
        latest_date = VALUES(latest_date),
        change_value = VALUES(change_value),
        change_percent = VALUES(change_percent),
        trend_direction = VALUES(trend_direction),
        confidence = VALUES(confidence),
        source_document_ids = VALUES(source_document_ids),
        updated_at = NOW()`,
      [
        id,
        userId,
        trend.metricName,
        trend.previousValue || null,
        trend.latestValue,
        trend.unit || '',
        trend.previousDate || null,
        trend.latestDate || null,
        trend.changeValue || null,
        trend.changePercent !== undefined ? trend.changePercent : null,
        trend.trendDirection || 'INSUFFICIENT_DATA',
        trend.confidence || 0.90,
        sourceDocs
      ]
    );

    return { id, userId, ...trend };
  }

  static async getTrends(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_health_trends WHERE user_id = ? ORDER BY metric_name ASC`,
      [userId]
    );
    return (rows || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      metricName: r.metric_name,
      previousValue: r.previous_value,
      latestValue: r.latest_value,
      unit: r.unit,
      previousDate: r.previous_date,
      latestDate: r.latest_date,
      changeValue: r.change_value,
      changePercent: r.change_percent !== null ? Number(r.change_percent) : null,
      trendDirection: r.trend_direction,
      confidence: Number(r.confidence || 0.90),
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  static async getTrendByMetric(userId, metricName) {
    if (!userId || !metricName) return null;
    const [rows] = await pool.query(
      `SELECT * FROM ai_health_trends WHERE user_id = ? AND metric_name = ? LIMIT 1`,
      [userId, metricName]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      metricName: r.metric_name,
      previousValue: r.previous_value,
      latestValue: r.latest_value,
      unit: r.unit,
      previousDate: r.previous_date,
      latestDate: r.latest_date,
      changeValue: r.change_value,
      changePercent: r.change_percent !== null ? Number(r.change_percent) : null,
      trendDirection: r.trend_direction,
      confidence: Number(r.confidence || 0.90),
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  // ===================== HEALTH ALERTS =====================
  static async createAlert(userId, alert) {
    if (!userId || !alert || !alert.metric || !alert.alertType) {
      throw new Error('userId, metric, and alertType are required to create alert.');
    }

    const id = alert.id || `ha_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const evidence = Array.isArray(alert.evidence) ? JSON.stringify(alert.evidence) : (alert.evidence || '[]');
    const sourceDocs = Array.isArray(alert.sourceDocumentIds) ? JSON.stringify(alert.sourceDocumentIds) : (alert.sourceDocumentIds || '[]');

    await pool.query(
      `INSERT INTO ai_health_alerts (
        id, user_id, alert_type, metric, severity, message, evidence, source_document_ids, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        alert.alertType,
        alert.metric,
        alert.severity || 'MEDIUM',
        alert.message || '',
        evidence,
        sourceDocs,
        alert.status || 'ACTIVE'
      ]
    );

    return { id, userId, ...alert, status: alert.status || 'ACTIVE' };
  }

  static async getActiveAlerts(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_health_alerts WHERE user_id = ? AND status = ? ORDER BY created_at DESC`,
      [userId, 'ACTIVE']
    );
    return (rows || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      alertType: r.alert_type,
      metric: r.metric,
      severity: r.severity,
      message: r.message,
      evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence || [],
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      status: r.status,
      createdAt: r.created_at,
      dismissedAt: r.dismissed_at
    }));
  }

  static async getAllAlerts(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_health_alerts WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return (rows || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      alertType: r.alert_type,
      metric: r.metric,
      severity: r.severity,
      message: r.message,
      evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence || [],
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      status: r.status,
      createdAt: r.created_at,
      dismissedAt: r.dismissed_at
    }));
  }

  static async dismissAlert(alertId, userId) {
    if (!alertId || !userId) return false;
    const [res] = await pool.query(
      `UPDATE ai_health_alerts SET status = ?, dismissed_at = NOW() WHERE id = ? AND user_id = ?`,
      ['DISMISSED', alertId, userId]
    );
    return (res?.affectedRows || 0) > 0;
  }

  // ===================== DOCTOR BRIEFINGS =====================
  static async saveDoctorBriefing(userId, briefingData, sourceDocs = [], status = 'READY') {
    if (!userId || !briefingData) {
      throw new Error('userId and briefingData are required.');
    }

    const id = `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const briefingJson = typeof briefingData === 'string' ? briefingData : JSON.stringify(briefingData);
    const docsJson = Array.isArray(sourceDocs) ? JSON.stringify(sourceDocs) : (sourceDocs || '[]');

    await pool.query(
      `INSERT INTO ai_doctor_briefings (
        id, user_id, briefing_data, source_document_ids, status
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, userId, briefingJson, docsJson, status]
    );

    return {
      id,
      userId,
      briefingData: typeof briefingData === 'string' ? JSON.parse(briefingData) : briefingData,
      sourceDocumentIds: Array.isArray(sourceDocs) ? sourceDocs : [],
      status,
      generatedAt: new Date().toISOString()
    };
  }

  static async getDoctorBriefingById(id, userId) {
    if (!id || !userId) return null;
    const [rows] = await pool.query(
      `SELECT * FROM ai_doctor_briefings WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      briefingData: typeof r.briefing_data === 'string' ? JSON.parse(r.briefing_data) : r.briefing_data,
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      status: r.status,
      generatedAt: r.generated_at
    };
  }

  static async getDoctorBriefings(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_doctor_briefings WHERE user_id = ? ORDER BY generated_at DESC`,
      [userId]
    );
    return (rows || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      briefingData: typeof r.briefing_data === 'string' ? JSON.parse(r.briefing_data) : r.briefing_data,
      sourceDocumentIds: typeof r.source_document_ids === 'string' ? JSON.parse(r.source_document_ids) : r.source_document_ids || [],
      status: r.status,
      generatedAt: r.generated_at
    }));
  }

  static async updateBriefingStatus(id, userId, status) {
    if (!id || !userId) return false;
    const [res] = await pool.query(
      `UPDATE ai_doctor_briefings SET status = ? WHERE id = ? AND user_id = ?`,
      [status, id, userId]
    );
    return (res?.affectedRows || 0) > 0;
  }

  static async clearHealthIntelligenceData(userId) {
    if (!userId) return;
    await pool.query(`DELETE FROM ai_health_trends WHERE user_id = ?`, [userId]);
    await pool.query(`DELETE FROM ai_health_alerts WHERE user_id = ?`, [userId]);
    await pool.query(`DELETE FROM ai_doctor_briefings WHERE user_id = ?`, [userId]);
  }
}

module.exports = { AiHealthIntelligenceRepository };
