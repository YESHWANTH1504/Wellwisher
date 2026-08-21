const mysql = require('mysql2/promise');
require('dotenv').config();

// Real MySQL Connection Pool (Production & Standard Runtime)
const realPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wellwisher',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function isProductionMode() {
  return process.env.NODE_ENV === 'production';
}

function isTestOrMockMode() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.execArgv.includes('--test') ||
    process.env.npm_lifecycle_event === 'test' ||
    process.env.ENABLE_IN_MEMORY_DEV_FALLBACK === 'true'
  );
}

/**
 * Isolated In-Memory Storage Engine
 * Strictly restricted to automated unit/integration test suites (NODE_ENV === 'test')
 * or explicit local dev fallback (ENABLE_IN_MEMORY_DEV_FALLBACK === 'true').
 * NEVER active in production.
 */
class InMemoryDatabaseEngine {
  constructor() {
    this.store = {
      users: [],
      routines: [],
      hydration_logs: [],
      vitals_logs: [],
      medications: [],
      sleep_mood_logs: [],
      screen_care_settings: [],
      journal_logs: [],
      cognitive_game_scores: [],
      family_members: [],
      family_nudges: [],
      ai_conversations: [],
      ai_conversation_messages: [],
      ai_memories: [],
      ai_preferences: [],
      ai_action_permissions: [],
      ai_agent_runs: [],
      ai_agent_steps: [],
      ai_proactive_events: [],
      ai_behavior_patterns: [],
      ai_personal_profiles: [],
      ai_documents: [],
      ai_document_pages: [],
      ai_document_extractions: [],
      ai_document_summaries: [],
      ai_health_trends: [],
      ai_health_alerts: [],
      ai_doctor_briefings: [],
      ai_appointments: [],
      ai_workflow_actions: [],
      medications: []
    };
  }

  execute(sql, params = []) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const lower = cleanSql.toLowerCase();

    // 1. Health check
    if (lower.includes('select 1 + 1')) {
      return [[{ solution: 2 }]];
    }

    // 2. Routines table
    if (lower.includes('from routines') || lower.includes('into routines') || lower.includes('update routines')) {
      if (lower.startsWith('select')) {
        let rows = this.store.routines.filter(r => !r.deleted_at);

        if (lower.includes('group by status')) {
          const [userId, date] = params;
          const filtered = rows.filter(r => r.user_id === userId && r.date === date);
          const grouped = {};
          for (const item of filtered) {
            grouped[item.status] = (grouped[item.status] || 0) + 1;
          }
          return [Object.entries(grouped).map(([status, count]) => ({ status, count }))];
        }

        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          rows = rows.filter(r => r.id === id && r.user_id === userId);
        } else if (lower.includes('where user_id = ? and date = ?')) {
          const [userId, date] = params;
          rows = rows.filter(r => r.user_id === userId && r.date === date);
        } else if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          rows = rows.filter(r => r.user_id === userId);
        } else if (params.length === 1 && lower.includes('where id = ?')) {
          rows = rows.filter(r => r.id === params[0]);
        }
        return [rows];
      }

      if (lower.startsWith('insert into routines')) {
        const [id, userId, title, description, time, category, status, date, reminderEnabled] = params;
        this.store.routines.push({
          id: id || `rot_${Date.now()}`,
          user_id: userId,
          title,
          description: description || '',
          time,
          category: category || 'other',
          status: status || 'upcoming',
          date,
          reminder_enabled: reminderEnabled ? 1 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
        return [{ insertId: 1, affectedRows: 1 }];
      }

      if (lower.startsWith('update routines set deleted_at')) {
        const [id, userId] = params;
        const idx = this.store.routines.findIndex(r => r.id === id && r.user_id === userId && !r.deleted_at);
        if (idx !== -1) {
          this.store.routines[idx].deleted_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      if (lower.startsWith('update routines set')) {
        const [title, description, time, category, status, date, reminderEnabled, id, userId] = params;
        const idx = this.store.routines.findIndex(r => r.id === id && r.user_id === userId && !r.deleted_at);
        if (idx !== -1) {
          this.store.routines[idx] = {
            ...this.store.routines[idx],
            title, description, time, category, status, date, reminder_enabled: reminderEnabled,
            updated_at: new Date().toISOString()
          };
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    // 3. Hydration logs
    if (lower.includes('hydration_logs')) {
      if (lower.startsWith('select')) {
        const [userId, date] = params;
        const total = this.store.hydration_logs
          .filter(h => h.user_id === userId && (date ? h.date === date : true))
          .reduce((acc, curr) => acc + (curr.amount_ml || 0), 0);
        return [[{ total_ml: total }]];
      }
      if (lower.startsWith('insert')) {
        const [userId, amount, date] = params;
        this.store.hydration_logs.push({ user_id: userId, amount_ml: amount, date });
        return [{ insertId: this.store.hydration_logs.length, affectedRows: 1 }];
      }
    }

    // 4. Users table
    if (lower.includes('from users') || lower.includes('into users')) {
      if (lower.includes('where email = ?')) {
        const user = this.store.users.find(u => u.email === params[0]);
        return [user ? [user] : []];
      }
      if (lower.includes('where id = ?')) {
        const user = this.store.users.find(u => u.id === params[0]);
        return [user ? [user] : []];
      }
      if (lower.startsWith('insert into users')) {
        const [name, email, passwordHash] = params;
        const newId = this.store.users.length + 1;
        this.store.users.push({ id: newId, name, email, password_hash: passwordHash, created_at: new Date().toISOString() });
        return [{ insertId: newId, affectedRows: 1 }];
      }
    }

    // 5. Vitals logs
    if (lower.includes('vitals_logs')) {
      if (lower.startsWith('select')) {
        return [this.store.vitals_logs.filter(v => v.user_id === params[0])];
      }
      if (lower.startsWith('insert')) {
        this.store.vitals_logs.push({ user_id: params[0], ...params });
        return [{ insertId: this.store.vitals_logs.length, affectedRows: 1 }];
      }
    }

    // 6. Medications Table
    if (lower.includes('medications')) {
      if (lower.startsWith('select')) {
        const [userId] = params;
        const meds = this.store.medications.filter(m => m.user_id == userId);
        return [meds];
      }
      if (lower.startsWith('insert')) {
        let id, userId, name, dosage, time, remaining;
        if (params.length === 6) {
          [id, userId, name, dosage, time, remaining] = params;
        } else {
          [userId, name, dosage, time, remaining] = params;
          id = this.store.medications.length + 1;
        }
        const med = {
          id: id || this.store.medications.length + 1,
          user_id: userId,
          name,
          dosage,
          schedule_time: time,
          remaining_pills: remaining !== undefined ? remaining : 30,
          created_at: new Date().toISOString()
        };
        this.store.medications.push(med);
        return [{ insertId: med.id, affectedRows: 1 }];
      }
      if (lower.startsWith('update medications')) {
        const [id, userId] = params;
        const idx = this.store.medications.findIndex(m => m.id == id && m.user_id == userId);
        if (idx !== -1) {
          this.store.medications[idx].remaining_pills = Math.max(0, this.store.medications[idx].remaining_pills - 1);
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('delete from medications')) {
        const [userId] = params;
        const prev = this.store.medications.length;
        this.store.medications = this.store.medications.filter(m => m.user_id != userId);
        return [{ affectedRows: prev - this.store.medications.length }];
      }
    }

    // 7. Sleep & Mood logs
    if (lower.includes('sleep_mood_logs')) {
      if (lower.startsWith('select')) {
        const [userId, date] = params;
        const logs = this.store.sleep_mood_logs.filter(s => s.user_id === userId && (date ? s.date === date : true));
        return [logs];
      }
      if (lower.startsWith('insert')) {
        const [userId, hours, bedtime, wakeTime, mood, date] = params;
        const id = this.store.sleep_mood_logs.length + 1;
        this.store.sleep_mood_logs.push({
          id, user_id: userId, sleep_hours: hours, bedtime, wake_time: wakeTime, mood_rating: mood, date, created_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }
    }

    // 8. Journal logs
    if (lower.includes('journal_logs')) {
      if (lower.startsWith('select')) {
        const [userId] = params;
        return [this.store.journal_logs.filter(j => j.user_id === userId)];
      }
      if (lower.startsWith('insert')) {
        const [userId, text, sentiment, score, flag, feedback, date] = params;
        const id = this.store.journal_logs.length + 1;
        this.store.journal_logs.push({
          id, user_id: userId, journal_text: text, sentiment, mood_score: score, caregiver_flag: flag || 0, ai_feedback: feedback, date, created_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }
    }

    // 9. Family members & nudges
    if (lower.includes('family_members')) {
      if (lower.startsWith('select')) {
        const [userId] = params;
        return [this.store.family_members.filter(f => f.user_id === userId)];
      }
      if (lower.startsWith('insert')) {
        const [userId, name, rel, status] = params;
        const id = this.store.family_members.length + 1;
        this.store.family_members.push({
          id, user_id: userId, member_name: name, relation: rel, status: status || 'connected', created_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }
    }

    if (lower.includes('family_nudges')) {
      if (lower.startsWith('insert')) {
        const [from, to, type, msg] = params;
        const id = this.store.family_nudges.length + 1;
        this.store.family_nudges.push({
          id, from_user_name: from, to_user_name: to, nudge_type: type, message: msg, created_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }
    }

    // 10. AI Conversations
    if (lower.includes('ai_conversations')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          const conv = this.store.ai_conversations.find(c => c.id === id && c.user_id === userId && !c.deleted_at);
          return [conv ? [conv] : []];
        }
        const [userId] = params;
        const list = this.store.ai_conversations.filter(c => c.user_id === userId && !c.deleted_at);
        return [list];
      }
      if (lower.startsWith('insert into ai_conversations')) {
        const [id, userId, title, metadata] = params;
        this.store.ai_conversations.push({
          id, user_id: userId, title, metadata, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null
        });
        return [{ insertId: 1, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_conversations set deleted_at')) {
        const [id, userId] = params;
        const idx = this.store.ai_conversations.findIndex(c => c.id === id && c.user_id === userId);
        if (idx !== -1) {
          this.store.ai_conversations[idx].deleted_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('update ai_conversations set title')) {
        const [title, id, userId] = params;
        const idx = this.store.ai_conversations.findIndex(c => c.id === id && c.user_id === userId);
        if (idx !== -1) {
          this.store.ai_conversations[idx].title = title;
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('update ai_conversations set updated_at')) {
        const [id] = params;
        const idx = this.store.ai_conversations.findIndex(c => c.id === id);
        if (idx !== -1) this.store.ai_conversations[idx].updated_at = new Date().toISOString();
        return [{ affectedRows: 1 }];
      }
    }

    // 11. AI Conversation Messages
    if (lower.includes('ai_conversation_messages')) {
      if (lower.startsWith('select')) {
        const [convId, userId] = params;
        const msgs = this.store.ai_conversation_messages.filter(m => m.conversation_id === convId && m.user_id === userId);
        return [msgs];
      }
      if (lower.startsWith('insert into ai_conversation_messages')) {
        const [id, conversationId, userId, role, content, toolCalls, metadata] = params;
        this.store.ai_conversation_messages.push({
          id, conversation_id: conversationId, user_id: userId, role, content, tool_calls: toolCalls, metadata, created_at: new Date().toISOString()
        });
        return [{ insertId: 1, affectedRows: 1 }];
      }
    }

    // 12. AI Memories
    if (lower.includes('ai_memories')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          const mem = this.store.ai_memories.find(m => m.id === parseInt(id, 10) && m.user_id === userId);
          return [mem ? [mem] : []];
        }
        if (lower.includes('like ?')) {
          const [userId, term] = params;
          const cleanTerm = term.replace(/%/g, '').toLowerCase();
          const matches = this.store.ai_memories.filter(m => 
            m.user_id === userId && 
            (m.memory_key.toLowerCase().includes(cleanTerm) || m.memory_value.toLowerCase().includes(cleanTerm))
          );
          return [matches];
        }
        if (lower.includes('memory_type = ?')) {
          const [userId, type] = params;
          return [this.store.ai_memories.filter(m => m.user_id === userId && m.memory_type === type)];
        }
        const [userId] = params;
        return [this.store.ai_memories.filter(m => m.user_id === userId)];
      }

      if (lower.startsWith('insert into ai_memories')) {
        const [userId, memoryType, memoryKey, memoryValue, source, importance, metadata] = params;
        const newId = this.store.ai_memories.length + 1;
        this.store.ai_memories.push({
          id: newId,
          user_id: userId,
          memory_type: memoryType,
          memory_key: memoryKey,
          memory_value: memoryValue,
          source,
          importance,
          metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_accessed_at: null
        });
        return [{ insertId: newId, affectedRows: 1 }];
      }

      if (lower.startsWith('update ai_memories set last_accessed_at')) {
        const [id, userId] = params;
        const idx = this.store.ai_memories.findIndex(m => m.id === parseInt(id, 10) && m.user_id === userId);
        if (idx !== -1) {
          this.store.ai_memories[idx].last_accessed_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      if (lower.startsWith('update ai_memories set')) {
        const [val, imp, meta, id, userId] = params;
        const idx = this.store.ai_memories.findIndex(m => m.id === parseInt(id, 10) && m.user_id === userId);
        if (idx !== -1) {
          this.store.ai_memories[idx].memory_value = val;
          this.store.ai_memories[idx].importance = imp;
          this.store.ai_memories[idx].metadata = meta;
          this.store.ai_memories[idx].updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      if (lower.startsWith('delete from ai_memories')) {
        const prevLen = this.store.ai_memories.length;
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          this.store.ai_memories = this.store.ai_memories.filter(m => !(m.id === parseInt(id, 10) && m.user_id === userId));
          return [{ affectedRows: prevLen - this.store.ai_memories.length }];
        }
        if (lower.includes('where user_id = ? and source !=')) {
          const [userId, src] = params;
          this.store.ai_memories = this.store.ai_memories.filter(m => !(m.user_id === userId && m.source !== (src || 'USER_EXPLICIT')));
          return [{ affectedRows: prevLen - this.store.ai_memories.length }];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          this.store.ai_memories = this.store.ai_memories.filter(m => m.user_id !== userId);
          return [{ affectedRows: prevLen - this.store.ai_memories.length }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    // 13. AI Preferences
    if (lower.includes('ai_preferences')) {
      if (lower.startsWith('select')) {
        const [userId] = params;
        const p = this.store.ai_preferences.find(pref => pref.user_id === userId);
        return [p ? [p] : []];
      }
      if (lower.startsWith('insert into ai_preferences')) {
        let record = {};
        if (params.length === 18) {
          const [
            userId, name, voice, tts, proactive, reminders, daily, evening, proVoice,
            quiet, quietStart, quietEnd, freq, briefingTime, summaryTime, style, wake, lang
          ] = params;
          record = {
            id: this.store.ai_preferences.length + 1,
            user_id: userId,
            assistant_name: name,
            voice_enabled: voice,
            tts_enabled: tts,
            proactive_assistance_enabled: proactive,
            proactive_reminders_enabled: reminders,
            daily_briefing_enabled: daily,
            evening_summary_enabled: evening,
            proactive_voice_enabled: proVoice,
            quiet_hours_enabled: quiet,
            quiet_hours_start: quietStart,
            quiet_hours_end: quietEnd,
            notification_frequency: freq,
            briefing_time: briefingTime,
            summary_time: summaryTime,
            preferred_response_style: style,
            wake_word_enabled: wake,
            language_preference: lang,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          const [userId, name, voice, tts, proactive, style, wake, lang] = params;
          record = {
            id: this.store.ai_preferences.length + 1,
            user_id: userId,
            assistant_name: name,
            voice_enabled: voice,
            tts_enabled: tts,
            proactive_assistance_enabled: proactive,
            proactive_reminders_enabled: 1,
            daily_briefing_enabled: 1,
            evening_summary_enabled: 1,
            proactive_voice_enabled: 1,
            quiet_hours_enabled: 1,
            quiet_hours_start: '22:00',
            quiet_hours_end: '07:00',
            notification_frequency: 'BALANCED',
            briefing_time: '08:00 AM',
            summary_time: '08:30 PM',
            preferred_response_style: style,
            wake_word_enabled: wake,
            language_preference: lang,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }

        const existingIdx = this.store.ai_preferences.findIndex(pref => pref.user_id === record.user_id);
        if (existingIdx !== -1) {
          record.id = this.store.ai_preferences[existingIdx].id;
          this.store.ai_preferences[existingIdx] = record;
        } else {
          this.store.ai_preferences.push(record);
        }
        return [{ insertId: record.id, affectedRows: 1 }];
      }
    }

    // 13.5. AI Proactive Events
    if (lower.includes('ai_proactive_events')) {
      if (lower.startsWith('select')) {
        if (lower.includes('count(*)')) {
          const [userId, sinceTime] = params;
          const count = this.store.ai_proactive_events.filter(e => 
            e.user_id === userId && 
            e.status !== 'CANCELLED' && 
            new Date(e.created_at) >= new Date(sinceTime)
          ).length;
          return [[{ count }]];
        }

        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          const ev = this.store.ai_proactive_events.find(e => e.id === id && e.user_id === userId);
          return [ev ? [ev] : []];
        }

        if (lower.includes('where user_id = ? and event_type = ?')) {
          const [userId, eventType, relatedEntityType, relatedEntityId] = params;
          const ev = this.store.ai_proactive_events.find(e => 
            e.user_id === userId &&
            e.event_type === eventType &&
            e.related_entity_type === relatedEntityType &&
            String(e.related_entity_id) === String(relatedEntityId) &&
            ['PENDING', 'DELIVERED'].includes(e.status)
          );
          return [ev ? [ev] : []];
        }

        // Active Feed query
        const userId = params[0];
        const events = this.store.ai_proactive_events.filter(e => e.user_id === userId && ['PENDING', 'DELIVERED'].includes(e.status));
        return [events];
      }

      if (lower.startsWith('insert into ai_proactive_events')) {
        const [
          id, userId, eventType, priority, title, message, source,
          relatedEntityType, relatedEntityId, scheduledFor, status, actionPayload, metadata, expiresAt
        ] = params;
        const newEvent = {
          id,
          user_id: userId,
          event_type: eventType,
          priority,
          title,
          message,
          source,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : new Date().toISOString(),
          delivered_at: null,
          status: status || 'PENDING',
          action_payload: actionPayload,
          metadata,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.store.ai_proactive_events.push(newEvent);
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (lower.startsWith('update ai_proactive_events set status = ?')) {
        const [status, deliveredAt, id, userId] = params;
        const idx = this.store.ai_proactive_events.findIndex(e => e.id === id && e.user_id === userId);
        if (idx !== -1) {
          this.store.ai_proactive_events[idx].status = status;
          if (deliveredAt || status === 'DELIVERED') {
            this.store.ai_proactive_events[idx].delivered_at = new Date().toISOString();
          }
          this.store.ai_proactive_events[idx].updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    // 13.8. AI Behavior Patterns
    if (lower.includes('ai_behavior_patterns')) {
      if (lower.startsWith('select')) {
        if (lower.includes('pattern_type = ? and pattern_key = ?')) {
          const [userId, pType, pKey] = params;
          const match = this.store.ai_behavior_patterns.find(p => p.user_id === userId && p.pattern_type === pType && p.pattern_key === pKey);
          return [match ? [match] : []];
        }
        const [userId] = params;
        const patterns = this.store.ai_behavior_patterns.filter(p => p.user_id === userId && p.status === 'ACTIVE');
        return [patterns];
      }

      if (lower.startsWith('insert into ai_behavior_patterns')) {
        const [id, userId, pType, pKey, pVal, conf, evCount, status, source, metadata] = params;
        const newPattern = {
          id,
          user_id: userId,
          pattern_type: pType,
          pattern_key: pKey,
          pattern_value: pVal,
          confidence_score: conf,
          evidence_count: evCount,
          status,
          source,
          metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.store.ai_behavior_patterns.push(newPattern);
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (lower.startsWith('update ai_behavior_patterns set')) {
        const [pVal, evCount, conf, status, id, userId] = params;
        const idx = this.store.ai_behavior_patterns.findIndex(p => p.id === id && p.user_id === userId);
        if (idx !== -1) {
          this.store.ai_behavior_patterns[idx].pattern_value = pVal;
          this.store.ai_behavior_patterns[idx].evidence_count = evCount;
          this.store.ai_behavior_patterns[idx].confidence_score = conf;
          this.store.ai_behavior_patterns[idx].status = status;
          this.store.ai_behavior_patterns[idx].updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    // 13.9. AI Personal Profiles
    if (lower.includes('ai_personal_profiles')) {
      if (lower.startsWith('select')) {
        const [userId] = params;
        const prof = this.store.ai_personal_profiles.find(p => p.user_id === userId);
        return [prof ? [prof] : []];
      }
      if (lower.startsWith('insert into ai_personal_profiles')) {
        const [id, userId, profileData] = params;
        const existingIdx = this.store.ai_personal_profiles.findIndex(p => p.user_id === userId);
        const record = {
          id,
          user_id: userId,
          profile_data: profileData,
          version: existingIdx !== -1 ? (this.store.ai_personal_profiles[existingIdx].version + 1) : 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (existingIdx !== -1) {
          this.store.ai_personal_profiles[existingIdx] = record;
        } else {
          this.store.ai_personal_profiles.push(record);
        }
        return [{ insertId: id, affectedRows: 1 }];
      }
      if (lower.startsWith('delete from ai_personal_profiles')) {
        const [userId] = params;
        const prevLen = this.store.ai_personal_profiles.length;
        this.store.ai_personal_profiles = this.store.ai_personal_profiles.filter(p => p.user_id !== userId);
        return [{ affectedRows: prevLen - this.store.ai_personal_profiles.length }];
      }
    }

    // 14. AI Action Permissions
    if (lower.includes('ai_action_permissions')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where user_id = ? and action_key = ?')) {
          const [userId, actionKey] = params;
          const perm = this.store.ai_action_permissions.find(p => p.user_id === userId && p.action_key === actionKey);
          return [perm ? [perm] : []];
        }
        const [userId] = params;
        return [this.store.ai_action_permissions.filter(p => p.user_id === userId)];
      }
      if (lower.startsWith('insert')) {
        const [userId, actionKey, permState] = params;
        const existingIdx = this.store.ai_action_permissions.findIndex(p => p.user_id === userId && p.action_key === actionKey);
        if (existingIdx !== -1) {
          this.store.ai_action_permissions[existingIdx].permission_state = permState;
        } else {
          this.store.ai_action_permissions.push({
            id: this.store.ai_action_permissions.length + 1,
            user_id: userId,
            action_key: actionKey,
            permission_state: permState,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        return [{ insertId: 1, affectedRows: 1 }];
      }
    }

    // 15. AI Agent Runs & Steps
    if (lower.includes('ai_agent_runs')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          const run = this.store.ai_agent_runs.find(r => r.id === id && r.user_id === userId);
          return [run ? [run] : []];
        }
        const [userId] = params;
        return [this.store.ai_agent_runs.filter(r => r.user_id === userId)];
      }
      if (lower.startsWith('insert into ai_agent_runs')) {
        const [id, userId, convId, request, metadata] = params;
        this.store.ai_agent_runs.push({
          id, user_id: userId, conversation_id: convId, request, status: 'PLANNED', metadata, started_at: new Date().toISOString(), completed_at: null, error_message: null
        });
        return [{ insertId: 1, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_agent_runs')) {
        const [status, errMsg, meta, id, userId] = params;
        const idx = this.store.ai_agent_runs.findIndex(r => r.id === id && r.user_id === userId);
        if (idx !== -1) {
          if (status) this.store.ai_agent_runs[idx].status = status;
          if (errMsg) this.store.ai_agent_runs[idx].error_message = errMsg;
          if (meta) this.store.ai_agent_runs[idx].metadata = meta;
          if (['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED', 'CANCELLED'].includes(status)) {
            this.store.ai_agent_runs[idx].completed_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    if (lower.includes('ai_agent_steps')) {
      if (lower.startsWith('select')) {
        const [runId, userId] = params;
        const steps = this.store.ai_agent_steps.filter(s => s.agent_run_id === runId && s.user_id === userId);
        return [steps];
      }
      if (lower.startsWith('insert into ai_agent_steps')) {
        const [id, runId, userId, stepNum, toolName, status, inputStr] = params;
        this.store.ai_agent_steps.push({
          id, agent_run_id: runId, user_id: userId, step_number: stepNum, tool_name: toolName, status, input_json: inputStr, output_json: null, started_at: new Date().toISOString(), completed_at: null, error_message: null
        });
        return [{ insertId: 1, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_agent_steps')) {
        const [status, outputStr, errMsg, id, userId] = params;
        const idx = this.store.ai_agent_steps.findIndex(s => s.id === id && s.user_id === userId);
        if (idx !== -1) {
          if (status) this.store.ai_agent_steps[idx].status = status;
          if (outputStr) this.store.ai_agent_steps[idx].output_json = outputStr;
          if (errMsg) this.store.ai_agent_steps[idx].error_message = errMsg;
          if (['COMPLETED', 'FAILED', 'SKIPPED'].includes(status)) {
            this.store.ai_agent_steps[idx].completed_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
    }

    // 16. AI Documents
    if (lower.includes('ai_documents')) {
      if (lower.startsWith('select')) {
        let docs = this.store.ai_documents;
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          docs = docs.filter(d => d.id === id && d.user_id === userId);
          if (lower.includes("processing_status != 'deleted'")) {
            docs = docs.filter(d => d.processing_status !== 'DELETED');
          }
          return [docs];
        }
        if (lower.includes('where user_id = ? and document_type = ?')) {
          const [userId, docType] = params;
          docs = docs.filter(d => d.user_id === userId && d.document_type === docType && d.processing_status !== 'DELETED');
          return [docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))];
        }
        if (lower.includes('like')) {
          const [userId, q1, q2] = params;
          const cleanQ = (q1 || '').replace(/%/g, '').toLowerCase();
          docs = docs.filter(d => d.user_id === userId && d.processing_status !== 'DELETED' &&
            (d.original_filename.toLowerCase().includes(cleanQ) || d.document_type.toLowerCase().includes(cleanQ)));
          return [docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          docs = docs.filter(d => d.user_id === userId);
          if (!lower.includes('all')) {
            docs = docs.filter(d => d.processing_status !== 'DELETED');
          }
          return [docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))];
        }
        return [docs];
      }

      if (lower.startsWith('insert into ai_documents')) {
        const [id, userId, docType, filename, mimeType, fileSize, storageRef, status, meta] = params;
        const record = {
          id,
          user_id: userId,
          document_type: docType || 'UNKNOWN',
          original_filename: filename,
          mime_type: mimeType,
          file_size: fileSize,
          storage_reference: storageRef,
          processing_status: status || 'UPLOADED',
          metadata: meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : {},
          uploaded_at: new Date().toISOString(),
          processed_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.store.ai_documents.push(record);
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (lower.startsWith('update ai_documents set')) {
        if (lower.includes('processing_status = ?') && lower.includes('document_type = ?')) {
          const [status, docType, processedAt, meta, id, userId] = params;
          const idx = this.store.ai_documents.findIndex(d => d.id === id && d.user_id === userId);
          if (idx !== -1) {
            this.store.ai_documents[idx].processing_status = status;
            this.store.ai_documents[idx].document_type = docType;
            if (processedAt) this.store.ai_documents[idx].processed_at = processedAt;
            if (meta) this.store.ai_documents[idx].metadata = (typeof meta === 'string' ? JSON.parse(meta) : meta);
            this.store.ai_documents[idx].updated_at = new Date().toISOString();
            return [{ affectedRows: 1 }];
          }
          return [{ affectedRows: 0 }];
        }
        if (lower.includes('processing_status = ?')) {
          const [status, id, userId] = params;
          const idx = this.store.ai_documents.findIndex(d => d.id === id && d.user_id === userId);
          if (idx !== -1) {
            this.store.ai_documents[idx].processing_status = status;
            this.store.ai_documents[idx].updated_at = new Date().toISOString();
            return [{ affectedRows: 1 }];
          }
          return [{ affectedRows: 0 }];
        }
      }

      if (lower.startsWith('delete from ai_documents')) {
        if (lower.includes('where id = ? and user_id = ?')) {
          const [id, userId] = params;
          const prevLen = this.store.ai_documents.length;
          this.store.ai_documents = this.store.ai_documents.filter(d => !(d.id === id && d.user_id === userId));
          return [{ affectedRows: prevLen - this.store.ai_documents.length }];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          const prevLen = this.store.ai_documents.length;
          this.store.ai_documents = this.store.ai_documents.filter(d => d.user_id !== userId);
          return [{ affectedRows: prevLen - this.store.ai_documents.length }];
        }
      }
    }

    // 17. AI Document Pages
    if (lower.includes('ai_document_pages')) {
      if (lower.startsWith('select')) {
        const [docId, userId] = params;
        const pages = this.store.ai_document_pages.filter(p => p.document_id === docId && p.user_id === userId);
        return [pages.sort((a, b) => a.page_number - b.page_number)];
      }
      if (lower.startsWith('insert into ai_document_pages')) {
        const [id, docId, userId, pageNum, text, confidence, meta] = params;
        this.store.ai_document_pages.push({
          id,
          document_id: docId,
          user_id: userId,
          page_number: pageNum,
          ocr_text: text,
          confidence_score: confidence || 0.0,
          metadata: meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : {},
          created_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }
      if (lower.startsWith('delete from ai_document_pages')) {
        if (lower.includes('where document_id = ? and user_id = ?')) {
          const [docId, userId] = params;
          const prevLen = this.store.ai_document_pages.length;
          this.store.ai_document_pages = this.store.ai_document_pages.filter(p => !(p.document_id === docId && p.user_id === userId));
          return [{ affectedRows: prevLen - this.store.ai_document_pages.length }];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          const prevLen = this.store.ai_document_pages.length;
          this.store.ai_document_pages = this.store.ai_document_pages.filter(p => p.user_id !== userId);
          return [{ affectedRows: prevLen - this.store.ai_document_pages.length }];
        }
      }
    }

    // 18. AI Document Extractions
    if (lower.includes('ai_document_extractions')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where document_id = ? and user_id = ?')) {
          const [docId, userId] = params;
          const rows = this.store.ai_document_extractions.filter(e => e.document_id === docId && e.user_id === userId);
          return [rows.sort((a, b) => a.page_number - b.page_number)];
        }
        if (lower.includes('where user_id = ? and field_name = ?')) {
          const [userId, fieldName] = params;
          const rows = this.store.ai_document_extractions.filter(e => e.user_id === userId && e.field_name.toLowerCase() === fieldName.toLowerCase());
          return [rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          const rows = this.store.ai_document_extractions.filter(e => e.user_id === userId);
          return [rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))];
        }
        return [this.store.ai_document_extractions];
      }

      if (lower.startsWith('insert into ai_document_extractions')) {
        const [id, docId, userId, fieldName, fieldValue, normValue, unit, refRange, flag, category, conf, pageNum, srcText, status, observedAt, meta] = params;
        this.store.ai_document_extractions.push({
          id,
          document_id: docId,
          user_id: userId,
          field_name: fieldName,
          field_value: fieldValue,
          normalized_value: normValue || fieldValue,
          unit: unit || null,
          reference_range: refRange || null,
          flag: flag || 'NORMAL',
          category: category || null,
          confidence_score: conf || 0.0,
          page_number: pageNum || 1,
          source_text: srcText || null,
          extraction_status: status || 'EXTRACTED',
          observed_at: observedAt || null,
          metadata: meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (lower.startsWith('update ai_document_extractions set')) {
        const [status, id, userId] = params;
        const idx = this.store.ai_document_extractions.findIndex(e => e.id === id && e.user_id === userId);
        if (idx !== -1) {
          this.store.ai_document_extractions[idx].extraction_status = status;
          this.store.ai_document_extractions[idx].updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      if (lower.startsWith('delete from ai_document_extractions')) {
        if (lower.includes('where document_id = ? and user_id = ?')) {
          const [docId, userId] = params;
          const prevLen = this.store.ai_document_extractions.length;
          this.store.ai_document_extractions = this.store.ai_document_extractions.filter(e => !(e.document_id === docId && e.user_id === userId));
          return [{ affectedRows: prevLen - this.store.ai_document_extractions.length }];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          const prevLen = this.store.ai_document_extractions.length;
          this.store.ai_document_extractions = this.store.ai_document_extractions.filter(e => e.user_id !== userId);
          return [{ affectedRows: prevLen - this.store.ai_document_extractions.length }];
        }
      }
    }

    // 19. AI Document Summaries
    if (lower.includes('ai_document_summaries')) {
      if (lower.startsWith('select')) {
        if (lower.includes('where document_id = ? and user_id = ?')) {
          const [docId, userId] = params;
          const summary = this.store.ai_document_summaries.find(s => s.document_id === docId && s.user_id === userId);
          return [summary ? [summary] : []];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          return [this.store.ai_document_summaries.filter(s => s.user_id === userId)];
        }
        return [this.store.ai_document_summaries];
      }

      if (lower.startsWith('insert into ai_document_summaries')) {
        const [id, docId, userId, summaryText, keyFindings, outOfRange, uncertain, questions, warnings, conf, disclaimer] = params;
        const existingIdx = this.store.ai_document_summaries.findIndex(s => s.document_id === docId && s.user_id === userId);
        const record = {
          id,
          document_id: docId,
          user_id: userId,
          summary: summaryText,
          key_findings: typeof keyFindings === 'string' ? JSON.parse(keyFindings) : keyFindings,
          out_of_range_values: typeof outOfRange === 'string' ? JSON.parse(outOfRange) : outOfRange,
          uncertain_values: typeof uncertain === 'string' ? JSON.parse(uncertain) : uncertain,
          questions_for_doctor: typeof questions === 'string' ? JSON.parse(questions) : questions,
          warnings: typeof warnings === 'string' ? JSON.parse(warnings) : warnings,
          confidence: conf || 0.90,
          disclaimer: disclaimer || 'This is an informational summary and not a medical diagnosis.',
          generated_at: new Date().toISOString()
        };
        if (existingIdx !== -1) {
          this.store.ai_document_summaries[existingIdx] = record;
        } else {
          this.store.ai_document_summaries.push(record);
        }
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (lower.startsWith('delete from ai_document_summaries')) {
        if (lower.includes('where document_id = ? and user_id = ?')) {
          const [docId, userId] = params;
          const prevLen = this.store.ai_document_summaries.length;
          this.store.ai_document_summaries = this.store.ai_document_summaries.filter(s => !(s.document_id === docId && s.user_id === userId));
          return [{ affectedRows: prevLen - this.store.ai_document_summaries.length }];
        }
        if (lower.includes('where user_id = ?')) {
          const [userId] = params;
          const prevLen = this.store.ai_document_summaries.length;
          this.store.ai_document_summaries = this.store.ai_document_summaries.filter(s => s.user_id !== userId);
          return [{ affectedRows: prevLen - this.store.ai_document_summaries.length }];
        }
      }
    }

    // Phase 9: AI Health Trends
    if (lower.includes('ai_health_trends')) {
      if (lower.startsWith('select * from ai_health_trends where user_id = ? and metric_name = ?')) {
        const [userId, metric] = params;
        const trend = this.store.ai_health_trends.find(t => t.user_id === userId && t.metric_name.toLowerCase() === metric.toLowerCase());
        return [trend ? [trend] : []];
      }
      if (lower.startsWith('select * from ai_health_trends where user_id = ?')) {
        const [userId] = params;
        return [this.store.ai_health_trends.filter(t => t.user_id === userId)];
      }
      if (lower.startsWith('insert into ai_health_trends')) {
        const [id, userId, metric, prevVal, latestVal, unit, prevDate, latestDate, changeVal, changePct, trendDir, conf, sourceDocs] = params;
        const existingIdx = this.store.ai_health_trends.findIndex(t => t.user_id === userId && t.metric_name.toLowerCase() === metric.toLowerCase());
        const record = {
          id: id || `ht_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          metric_name: metric,
          previous_value: prevVal,
          latest_value: latestVal,
          unit: unit || '',
          previous_date: prevDate,
          latest_date: latestDate,
          change_value: changeVal,
          change_percent: changePct,
          trend_direction: trendDir || 'INSUFFICIENT_DATA',
          confidence: conf || 0.90,
          source_document_ids: typeof sourceDocs === 'string' ? JSON.parse(sourceDocs) : sourceDocs || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (existingIdx !== -1) {
          this.store.ai_health_trends[existingIdx] = record;
        } else {
          this.store.ai_health_trends.push(record);
        }
        return [{ insertId: record.id, affectedRows: 1 }];
      }
      if (lower.startsWith('delete from ai_health_trends where user_id = ?')) {
        const [userId] = params;
        const prev = this.store.ai_health_trends.length;
        this.store.ai_health_trends = this.store.ai_health_trends.filter(t => t.user_id !== userId);
        return [{ affectedRows: prev - this.store.ai_health_trends.length }];
      }
    }

    // Phase 9: AI Health Alerts
    if (lower.includes('ai_health_alerts')) {
      if (lower.startsWith('select * from ai_health_alerts where user_id = ? and status = ?')) {
        const [userId, status] = params;
        return [this.store.ai_health_alerts.filter(a => a.user_id === userId && a.status === status)];
      }
      if (lower.startsWith('select * from ai_health_alerts where user_id = ?')) {
        const [userId] = params;
        return [this.store.ai_health_alerts.filter(a => a.user_id === userId)];
      }
      if (lower.startsWith('insert into ai_health_alerts')) {
        const [id, userId, alertType, metric, severity, message, evidence, sourceDocs, status] = params;
        // Check for duplicate active alert for same metric and type
        const existing = this.store.ai_health_alerts.find(a => a.user_id === userId && a.metric === metric && a.alert_type === alertType && a.status === 'ACTIVE');
        if (existing) {
          return [{ insertId: existing.id, affectedRows: 0 }];
        }
        const record = {
          id: id || `ha_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          alert_type: alertType,
          metric,
          severity: severity || 'MEDIUM',
          message,
          evidence: typeof evidence === 'string' ? JSON.parse(evidence) : evidence || [],
          source_document_ids: typeof sourceDocs === 'string' ? JSON.parse(sourceDocs) : sourceDocs || [],
          status: status || 'ACTIVE',
          created_at: new Date().toISOString(),
          dismissed_at: null
        };
        this.store.ai_health_alerts.push(record);
        return [{ insertId: record.id, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_health_alerts set status = ?, dismissed_at = now() where id = ? and user_id = ?')) {
        const [status, id, userId] = params;
        const alert = this.store.ai_health_alerts.find(a => a.id === id && a.user_id === userId);
        if (alert) {
          alert.status = status;
          alert.dismissed_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('delete from ai_health_alerts where user_id = ?')) {
        const [userId] = params;
        const prev = this.store.ai_health_alerts.length;
        this.store.ai_health_alerts = this.store.ai_health_alerts.filter(a => a.user_id !== userId);
        return [{ affectedRows: prev - this.store.ai_health_alerts.length }];
      }
    }

    // Phase 9: AI Doctor Briefings
    if (lower.includes('ai_doctor_briefings')) {
      if (lower.startsWith('select * from ai_doctor_briefings where id = ? and user_id = ?')) {
        const [id, userId] = params;
        const b = this.store.ai_doctor_briefings.find(item => item.id === id && item.user_id === userId);
        return [b ? [b] : []];
      }
      if (lower.startsWith('select * from ai_doctor_briefings where user_id = ?')) {
        const [userId] = params;
        return [this.store.ai_doctor_briefings.filter(b => b.user_id === userId).sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))];
      }
      if (lower.startsWith('insert into ai_doctor_briefings')) {
        const [id, userId, briefingData, sourceDocs, status] = params;
        const record = {
          id: id || `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          briefing_data: typeof briefingData === 'string' ? JSON.parse(briefingData) : briefingData,
          generated_at: new Date().toISOString(),
          source_document_ids: typeof sourceDocs === 'string' ? JSON.parse(sourceDocs) : sourceDocs || [],
          status: status || 'READY'
        };
        this.store.ai_doctor_briefings.unshift(record);
        return [{ insertId: record.id, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_doctor_briefings set status = ? where id = ? and user_id = ?')) {
        const [status, id, userId] = params;
        const b = this.store.ai_doctor_briefings.find(item => item.id === id && item.user_id === userId);
        if (b) {
          b.status = status;
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('delete from ai_doctor_briefings where user_id = ?')) {
        const [userId] = params;
        const prev = this.store.ai_doctor_briefings.length;
        this.store.ai_doctor_briefings = this.store.ai_doctor_briefings.filter(b => b.user_id !== userId);
        return [{ affectedRows: prev - this.store.ai_doctor_briefings.length }];
      }
    }

    // Phase 10: AI Appointments
    if (lower.includes('ai_appointments')) {
      if (lower.startsWith('select * from ai_appointments where id = ? and user_id = ?')) {
        const [id, userId] = params;
        const a = this.store.ai_appointments.find(item => item.id === id && item.user_id === userId);
        return [a ? [a] : []];
      }
      if (lower.startsWith('select * from ai_appointments where user_id = ? and status = ?')) {
        const [userId, status] = params;
        const list = this.store.ai_appointments.filter(a => a.user_id === userId && a.status === status);
        return [list];
      }
      if (lower.startsWith('select * from ai_appointments where user_id = ? and scheduled_at >= ?')) {
        const [userId, minDate] = params;
        const list = this.store.ai_appointments.filter(a => a.user_id === userId && a.scheduled_at >= minDate);
        return [list];
      }
      if (lower.startsWith('select * from ai_appointments where user_id = ?')) {
        const [userId] = params;
        const list = this.store.ai_appointments.filter(a => a.user_id === userId).sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''));
        return [list];
      }
      if (lower.startsWith('insert into ai_appointments')) {
        const [id, userId, title, provider, appointmentType, scheduledAt, location, status, doctorName, notes, briefingId, followUpDate, doctorInstructions, testsRequested] = params;
        const record = {
          id: id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          title,
          provider: provider || 'WellWisher Health',
          appointment_type: appointmentType || 'General Consultation',
          scheduled_at: scheduledAt,
          location: location || '',
          status: status || 'PLANNED',
          doctor_name: doctorName || '',
          notes: notes || '',
          briefing_id: briefingId || null,
          follow_up_date: followUpDate || null,
          doctor_instructions: doctorInstructions || null,
          tests_requested: typeof testsRequested === 'string' ? JSON.parse(testsRequested) : testsRequested || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.store.ai_appointments.push(record);
        return [{ insertId: record.id, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_appointments set')) {
        if (lower.includes('where id = ? and user_id = ?')) {
          const id = params[params.length - 2];
          const userId = params[params.length - 1];
          const a = this.store.ai_appointments.find(item => item.id === id && item.user_id === userId);
          if (a) {
            if (lower.includes('status = ?') && lower.includes('doctor_instructions = ?')) {
              const [status, instructions, followUp, tests] = params;
              a.status = status;
              a.doctor_instructions = instructions;
              a.follow_up_date = followUp;
              a.tests_requested = typeof tests === 'string' ? JSON.parse(tests) : tests || [];
            } else if (lower.includes('status = ?') && lower.includes('briefing_id = ?')) {
              const [status, briefingId] = params;
              a.status = status;
              a.briefing_id = briefingId;
            } else if (lower.includes('status = ?')) {
              a.status = params[0];
            } else if (lower.includes('title = ?')) {
              const [title, provider, appType, scheduledAt, location, status, doctorName, notes] = params;
              if (title) a.title = title;
              if (provider) a.provider = provider;
              if (appType) a.appointment_type = appType;
              if (scheduledAt) a.scheduled_at = scheduledAt;
              if (location) a.location = location;
              if (status) a.status = status;
              if (doctorName) a.doctor_name = doctorName;
              if (notes) a.notes = notes;
            }
            a.updated_at = new Date().toISOString();
            return [{ affectedRows: 1 }];
          }
          return [{ affectedRows: 0 }];
        }
      }
      if (lower.startsWith('delete from ai_appointments where id = ? and user_id = ?')) {
        const [id, userId] = params;
        const prev = this.store.ai_appointments.length;
        this.store.ai_appointments = this.store.ai_appointments.filter(a => !(a.id === id && a.user_id === userId));
        return [{ affectedRows: prev - this.store.ai_appointments.length }];
      }
      if (lower.startsWith('delete from ai_appointments where user_id = ?')) {
        const [userId] = params;
        const prev = this.store.ai_appointments.length;
        this.store.ai_appointments = this.store.ai_appointments.filter(a => a.user_id !== userId);
        return [{ affectedRows: prev - this.store.ai_appointments.length }];
      }
    }

    // Phase 10: AI Workflow Actions
    if (lower.includes('ai_workflow_actions')) {
      if (lower.startsWith('select * from ai_workflow_actions where id = ? and user_id = ?')) {
        const [id, userId] = params;
        const w = this.store.ai_workflow_actions.find(item => item.id === id && item.user_id === userId);
        return [w ? [w] : []];
      }
      if (lower.startsWith('select * from ai_workflow_actions where user_id = ? and status = ?')) {
        const [userId, status] = params;
        const list = this.store.ai_workflow_actions.filter(w => w.user_id === userId && w.status === status);
        return [list];
      }
      if (lower.startsWith('select * from ai_workflow_actions where user_id = ?')) {
        const [userId] = params;
        const list = this.store.ai_workflow_actions.filter(w => w.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return [list];
      }
      if (lower.startsWith('insert into ai_workflow_actions')) {
        const [id, userId, actionType, entityType, entityId, status, requiresConfirmation, confirmationId, payload, result] = params;
        const record = {
          id: id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId || null,
          status: status || 'PENDING',
          requires_confirmation: requiresConfirmation !== undefined ? (requiresConfirmation ? 1 : 0) : 1,
          confirmation_id: confirmationId || null,
          payload: typeof payload === 'string' ? JSON.parse(payload) : payload || {},
          result: typeof result === 'string' ? JSON.parse(result) : result || null,
          created_at: new Date().toISOString(),
          completed_at: null
        };
        this.store.ai_workflow_actions.unshift(record);
        return [{ insertId: record.id, affectedRows: 1 }];
      }
      if (lower.startsWith('update ai_workflow_actions set status = ?, result = ?, completed_at = now() where id = ? and user_id = ?')) {
        const [status, result, id, userId] = params;
        const w = this.store.ai_workflow_actions.find(item => item.id === id && item.user_id === userId);
        if (w) {
          w.status = status;
          w.result = typeof result === 'string' ? JSON.parse(result) : result || null;
          w.completed_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('update ai_workflow_actions set status = ? where id = ? and user_id = ?')) {
        const [status, id, userId] = params;
        const w = this.store.ai_workflow_actions.find(item => item.id === id && item.user_id === userId);
        if (w) {
          w.status = status;
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith('delete from ai_workflow_actions where user_id = ?')) {
        const [userId] = params;
        const prev = this.store.ai_workflow_actions.length;
        this.store.ai_workflow_actions = this.store.ai_workflow_actions.filter(w => w.user_id !== userId);
        return [{ affectedRows: prev - this.store.ai_workflow_actions.length }];
      }
    }

    // Default Fallback
    if (lower.startsWith('select')) {
      return [[]];
    }
    return [{ insertId: 1, affectedRows: 1 }];
  }
}

const inMemoryEngine = new InMemoryDatabaseEngine();

// Database Access Gateway
const pool = {
  /**
   * Execute parameterized SQL query.
   * In Production: Strictly routes to MySQL pool. Throws on any database connectivity/query failure.
   * In Test/Explicit Local Mock: Routes to in-memory store if MySQL is not available.
   */
  async query(sql, params = []) {
    if (isProductionMode()) {
      // Production MUST always execute directly on MySQL. Never catch or fallback silently.
      return await realPool.query(sql, params);
    }

    // Non-production (Test or Development)
    try {
      return await realPool.query(sql, params);
    } catch (err) {
      if (isTestOrMockMode()) {
        return inMemoryEngine.execute(sql, params);
      }
      // If dev fallback is not enabled, propagate real MySQL error
      throw err;
    }
  },

  /**
   * Health check utility to probe MySQL connectivity directly without fallback.
   */
  async checkConnection() {
    return await realPool.query('SELECT 1 + 1 AS solution');
  }
};

module.exports = pool;
