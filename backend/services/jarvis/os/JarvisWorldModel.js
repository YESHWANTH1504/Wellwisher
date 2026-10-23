const pool = require('../../../config/db');

const ENTITY_TYPES = {
  PERSON: 'PERSON',
  CONTACT: 'CONTACT',
  CALENDAR_EVENT: 'CALENDAR_EVENT',
  REMINDER: 'REMINDER',
  TASK: 'TASK',
  APPLICATION: 'APPLICATION',
  DOCUMENT: 'DOCUMENT',
  PHOTO: 'PHOTO',
  LOCATION: 'LOCATION',
  DEVICE: 'DEVICE',
  HEALTH_RECORD: 'HEALTH_RECORD',
  CONVERSATION: 'CONVERSATION',
  MESSAGE: 'MESSAGE',
  NOTIFICATION: 'NOTIFICATION',
  WORKFLOW: 'WORKFLOW',
  MEDIA_ITEM: 'MEDIA_ITEM',
  MEMORY: 'MEMORY',
  APP_CAPABILITY: 'APP_CAPABILITY',
  APP_ACTION: 'APP_ACTION',
  SCREEN: 'SCREEN',
  SCREEN_ELEMENT: 'SCREEN_ELEMENT',
  DEVICE_STATE: 'DEVICE_STATE',
  // Phase 11: Anticipatory & Proactive Entity Types
  ROUTINE: 'ROUTINE',
  BEHAVIOR_PATTERN: 'BEHAVIOR_PATTERN',
  PROACTIVE_PREFERENCE: 'PROACTIVE_PREFERENCE',
  PROACTIVE_SUGGESTION: 'PROACTIVE_SUGGESTION',
  PROACTIVE_WORKFLOW: 'PROACTIVE_WORKFLOW',
  PREDICTION: 'PREDICTION',
  USER_FEEDBACK: 'USER_FEEDBACK'
};

const RELATION_TYPES = {
  KNOWS: 'KNOWS',
  CONTACT_OF: 'CONTACT_OF',
  INVOLVES: 'INVOLVES',
  PARTICIPANT_OF: 'PARTICIPANT_OF',
  BELONGS_TO: 'BELONGS_TO',
  RELATED_TO: 'RELATED_TO',
  DEPENDS_ON: 'DEPENDS_ON',
  PRECEDES: 'PRECEDES',
  FOLLOWS: 'FOLLOWS',
  OCCURS_AT: 'OCCURS_AT',
  REMINDER_FOR: 'REMINDER_FOR',
  CREATED_BY: 'CREATED_BY',
  MENTIONED_IN: 'MENTIONED_IN',
  ATTACHED_TO: 'ATTACHED_TO',
  PREPARES_FOR: 'PREPARES_FOR',
  EXECUTED_IN: 'EXECUTED_IN',
  USES: 'USES',
  LOCATED_AT: 'LOCATED_AT',
  DERIVED_FROM: 'DERIVED_FROM',
  INSTALLED_APPLICATION: 'INSTALLED_APPLICATION',
  PROVIDES_CAPABILITY: 'PROVIDES_CAPABILITY',
  CURRENTLY_ACTIVE: 'CURRENTLY_ACTIVE',
  RECENTLY_USED: 'RECENTLY_USED',
  BELONGS_TO_APPLICATION: 'BELONGS_TO_APPLICATION',
  BELONGS_TO_SCREEN: 'BELONGS_TO_SCREEN',
  TARGETS_APPLICATION: 'TARGETS_APPLICATION',
  // Phase 11: Proactive Relationships
  HAS_ROUTINE: 'HAS_ROUTINE',
  TRIGGERS_WORKFLOW: 'TRIGGERS_WORKFLOW',
  HAS_PROACTIVE_PREFERENCE: 'HAS_PROACTIVE_PREFERENCE',
  GENERATED_SUGGESTION: 'GENERATED_SUGGESTION',
  GENERATED_WORKFLOW: 'GENERATED_WORKFLOW',
  PRODUCES_OUTCOME: 'PRODUCES_OUTCOME'
};

/**
 * JarvisWorldModel
 * Persistent, user-isolated semantic personal knowledge graph and relationship model.
 * Maps relationships between User, People, Contacts, Applications, Calendar Events,
 * Documents, Tasks, and Workflows.
 */
class JarvisWorldModel {
  constructor() {
    this._cache = new Map(); // Key: `${userId}:${entityId}`
  }

  /**
   * Upsert a semantic entity into the world model
   */
  async upsertEntity(userId, {
    id,
    entityType,
    displayName,
    aliases = [],
    properties = {},
    confidence = 1.0,
    privacyLevel = 'PRIVATE',
    provenance = {}
  }) {
    if (!userId) throw new Error('JarvisWorldModel requires authenticated userId');
    const entityId = id || `ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const aliasesJson = JSON.stringify(aliases);
    const propertiesJson = JSON.stringify(properties);
    const provenanceJson = JSON.stringify({
      source: 'USER_INTERACTION',
      confidence,
      createdAt: new Date().toISOString(),
      ...provenance
    });

    await pool.query(
      `INSERT INTO jarvis_entities (
        id, user_id, entity_type, display_name, aliases, properties,
        confidence, privacy_level, provenance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        aliases = VALUES(aliases),
        properties = VALUES(properties),
        confidence = VALUES(confidence),
        privacy_level = VALUES(privacy_level),
        provenance = VALUES(provenance),
        updated_at = CURRENT_TIMESTAMP`,
      [
        entityId, userId, entityType, displayName, aliasesJson, propertiesJson,
        confidence, privacyLevel, provenanceJson
      ]
    );

    const record = {
      id: entityId,
      userId,
      entityType,
      displayName,
      aliases,
      properties,
      confidence,
      privacyLevel,
      provenance: JSON.parse(provenanceJson)
    };

    this._cache.set(`${userId}:${entityId}`, record);
    return record;
  }

  /**
   * Get entity by ID with strict user isolation
   */
  async getEntityById(userId, entityId) {
    if (!userId || !entityId) return null;
    const cached = this._cache.get(`${userId}:${entityId}`);
    if (cached) return cached;

    const [rows] = await pool.query(
      'SELECT * FROM jarvis_entities WHERE id = ? AND user_id = ?',
      [entityId, userId]
    );
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    const record = {
      id: r.id,
      userId: r.user_id,
      entityType: r.entity_type,
      displayName: r.display_name,
      aliases: typeof r.aliases === 'string' ? JSON.parse(r.aliases) : (r.aliases || []),
      properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
      confidence: parseFloat(r.confidence) || 1.0,
      privacyLevel: r.privacy_level,
      provenance: typeof r.provenance === 'string' ? JSON.parse(r.provenance) : (r.provenance || {})
    };
    this._cache.set(`${userId}:${entityId}`, record);
    return record;
  }

  /**
   * Establish a directed semantic relationship between two entities
   */
  async addRelation(userId, {
    id,
    sourceEntityId,
    targetEntityId,
    relationType,
    metadata = {},
    confidence = 1.0
  }) {
    if (!userId) throw new Error('JarvisWorldModel requires authenticated userId');
    const relationId = id || `rel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const metadataJson = JSON.stringify(metadata);

    await pool.query(
      `INSERT INTO jarvis_entity_relations (
        id, user_id, source_entity_id, target_entity_id, relation_type,
        metadata, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        metadata = VALUES(metadata),
        confidence = VALUES(confidence),
        updated_at = CURRENT_TIMESTAMP`,
      [relationId, userId, sourceEntityId, targetEntityId, relationType, metadataJson, confidence]
    );

    return {
      id: relationId,
      userId,
      sourceEntityId,
      targetEntityId,
      relationType,
      metadata,
      confidence
    };
  }

  /**
   * Delete a semantic relationship
   */
  async deleteRelation(userId, relationId) {
    if (!userId || !relationId) return false;
    const [res] = await pool.query('DELETE FROM jarvis_entity_relations WHERE id = ? AND user_id = ?', [relationId, userId]);
    return res.affectedRows > 0;
  }

  /**
   * Link reminder to calendar event via REMINDER_FOR relation
   */
  async linkReminderToEvent(userId, reminderId, eventId, metadata = {}) {
    return this.addRelation(userId, {
      sourceEntityId: reminderId,
      targetEntityId: eventId,
      relationType: RELATION_TYPES.REMINDER_FOR,
      metadata: {
        linkedAt: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Find entities matching a natural language reference or name
   */
  async findEntities(userId, queryText, entityType = null) {
    if (!userId) return [];
    const cleanQuery = (queryText || '').toLowerCase().trim();

    let sql = 'SELECT * FROM jarvis_entities WHERE user_id = ?';
    const params = [userId];

    if (entityType) {
      sql += ' AND entity_type = ?';
      params.push(entityType);
    }

    const [rows] = await pool.query(sql, params);
    if (!rows || rows.length === 0) return [];

    return rows.filter(row => {
      const name = (row.display_name || '').toLowerCase();
      if (name.includes(cleanQuery) || cleanQuery.includes(name)) return true;

      // Check aliases JSON
      try {
        const aliases = typeof row.aliases === 'string' ? JSON.parse(row.aliases) : (row.aliases || []);
        if (aliases.some(a => cleanQuery.includes(String(a).toLowerCase()) || String(a).toLowerCase().includes(cleanQuery))) {
          return true;
        }
      } catch (_) {}

      return false;
    }).map(row => ({
      id: row.id,
      entityType: row.entity_type,
      displayName: row.display_name,
      aliases: typeof row.aliases === 'string' ? JSON.parse(row.aliases) : (row.aliases || []),
      properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {}),
      confidence: parseFloat(row.confidence) || 1.0,
      privacyLevel: row.privacy_level
    }));
  }

  /**
   * Get related entities for a given entity and relation type
   */
  async getRelatedEntities(userId, entityId, relationType = null) {
    if (!userId || !entityId) return [];

    let sql = `
      SELECT e.*, r.id as relation_id, r.relation_type, r.metadata as relation_metadata
      FROM jarvis_entity_relations r
      JOIN jarvis_entities e ON r.target_entity_id = e.id AND e.user_id = r.user_id
      WHERE r.user_id = ? AND r.source_entity_id = ?
    `;
    const params = [userId, entityId];

    if (relationType) {
      sql += ' AND r.relation_type = ?';
      params.push(relationType);
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(r => ({
      id: r.id,
      relationId: r.relation_id,
      entityType: r.entity_type,
      displayName: r.display_name,
      relationType: r.relation_type,
      properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
      relationMetadata: typeof r.relation_metadata === 'string' ? JSON.parse(r.relation_metadata) : (r.relation_metadata || {})
    }));
  }

  /**
   * Query contextual connections for a person
   */
  async queryPersonContext(userId, personName) {
    const people = await this.findEntities(userId, personName, ENTITY_TYPES.PERSON);
    if (people.length === 0) return null;

    const person = people[0];
    const relatedEvents = await this.getRelatedEntities(userId, person.id, RELATION_TYPES.PARTICIPANT_OF);
    const relatedContacts = await this.getRelatedEntities(userId, person.id, RELATION_TYPES.CONTACT_OF);

    return {
      person,
      events: relatedEvents,
      contacts: relatedContacts
    };
  }
}

const defaultWorldModel = new JarvisWorldModel();

module.exports = {
  JarvisWorldModel,
  defaultWorldModel,
  ENTITY_TYPES,
  RELATION_TYPES
};
