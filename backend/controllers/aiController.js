const pool = require('../config/db');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');

class AiController {
  /**
   * AI Conversational Agent Endpoint (Routed to JARVIS Orchestrator)
   */
  static async chat(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { message, conversationId, timezone, langCode, language } = req.body || {};
      const trimmedMessage = (message || '').trim();

      if (!trimmedMessage) {
        return res.status(400).json({
          success: false,
          message: 'Chat message cannot be empty'
        });
      }

      const agentResponse = await defaultAgent.processRequest(req.userId, trimmedMessage, {
        conversationId,
        timezone: timezone || 'UTC',
        langCode: langCode || language || 'en-US'
      });

      // Standardize response payload with backward-compatible reply data
      return res.json({
        success: agentResponse.success,
        type: agentResponse.type,
        intent: agentResponse.intent,
        message: agentResponse.message,
        data: {
          reply: agentResponse.message,
          action: agentResponse.action || null,
          requiresConfirmation: agentResponse.requiresConfirmation,
          confirmation: agentResponse.confirmation || null,
          agentRunId: agentResponse.agentRunId,
          conversationId: agentResponse.conversationId,
          timestamp: agentResponse.timestamp
        }
      });
    } catch (err) {
      console.error('AI chat error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_AGENT_ERROR',
        message: 'Failed to process AI request'
      });
    }
  }

  /**
   * Action Confirmation Endpoint for Confirmed JARVIS Operations
   */
  static async confirmAction(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { confirmationId, toolName, arguments: toolArgs } = req.body || {};

      if (!confirmationId || !toolName) {
        return res.status(400).json({
          success: false,
          message: 'confirmationId and toolName are required for confirmation execution.'
        });
      }

      const agentResponse = await defaultAgent.processRequest(req.userId, '', {
        confirmationId,
        toolName,
        arguments: toolArgs || {}
      });

      return res.json(agentResponse);
    } catch (err) {
      console.error('Confirm action error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'CONFIRMATION_ERROR',
        message: 'Failed to execute confirmed action'
      });
    }
  }

  /**
   * Dynamic Personalized Plan Generator
   */
  static async generatePlan(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { planType } = req.body || {};
      let routines = [];

      if (planType === 'elderly' || planType === 'senior') {
        routines = [
          { title: '☀️ Gentle Morning Stretch & Water', time: '08:00 AM', category: 'wakeUp', description: 'Light seated stretching and 250ml warm water' },
          { title: '💊 Morning Medication & Breakfast', time: '08:30 AM', category: 'breakfast', description: 'Take prescribed morning medication with meal' },
          { title: '🚶 Gentle Garden Walk', time: '10:30 AM', category: 'exercise', description: '15-minute relaxed walk' },
          { title: '🥗 Healthy Lunch & Hydration', time: '01:00 PM', category: 'meal', description: 'Balanced lunch & 250ml water' },
          { title: '😴 Afternoon Rest & Nap', time: '02:30 PM', category: 'sleep', description: '45-minute restful nap' },
          { title: '👀 Screen & Eye Relaxation', time: '05:00 PM', category: 'eyeCare', description: 'Rest eyes and listen to relaxing music' },
          { title: '🍲 Light Dinner', time: '07:30 PM', category: 'meal', description: 'Nourishing light dinner' },
          { title: '😴 Early Bedtime Rest', time: '09:30 PM', category: 'sleep', description: 'Prepare for deep restful sleep' }
        ];
      } else if (planType === 'focus') {
        routines = [
          { title: '🎯 Morning Goal Setting & Water', time: '08:00 AM', category: 'wakeUp', description: 'Review top 3 daily priorities' },
          { title: '💻 Deep Work Session 1', time: '09:00 AM', category: 'office', description: '90 minutes uninterrupted focus' },
          { title: '👀 20-20-20 Eye Rest Break', time: '10:30 AM', category: 'eyeCare', description: 'Rest eyes for 20 seconds' },
          { title: '🏃 15-Min Power Walk', time: '03:00 PM', category: 'exercise', description: 'Quick brisk walk for energy' },
          { title: '📚 Evening Reading', time: '09:30 PM', category: 'custom', description: '30 mins focus reading' }
        ];
      } else {
        routines = [
          { title: '💧 Morning Hydration', time: '07:30 AM', category: 'waterReminder', description: 'Drink 500ml water' },
          { title: '🏃 30-Min Cardio Workout', time: '06:00 PM', category: 'exercise', description: 'Cardio exercise session' },
          { title: '🧘 Mindful Evening Meditation', time: '08:30 PM', category: 'stretchBreak', description: '10 mins deep breathing' }
        ];
      }

      return res.json({
        success: true,
        data: {
          planType: planType || 'elderly',
          routines: routines
        }
      });
    } catch (err) {
      console.error('Generate plan error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate AI plan'
      });
    }
  }

  /**
   * AI Journal & Symptom Sentiment Analyzer
   */
  static async analyzeJournal(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { text } = req.body || {};
      const trimmedText = (text || '').trim();

      if (!trimmedText) {
        return res.status(400).json({
          success: false,
          message: 'Journal entry text cannot be empty'
        });
      }

      const lower = trimmedText.toLowerCase();
      let sentiment = 'Calm & Positive';
      let moodScore = 8;
      let caregiverFlag = false;
      let aiFeedback = 'Your journal entry radiates a positive and balanced mindset. Keep staying active and connected!';

      if (lower.includes('sad') || lower.includes('lonely') || lower.includes('tired') || lower.includes('pain') || lower.includes('scared') || lower.includes('forget')) {
        sentiment = 'Elevated Stress & Concern';
        moodScore = 4;
        caregiverFlag = true;
        aiFeedback = 'We noticed expressions of tiredness or distress. We recommend speaking with a loved one or taking a relaxing walk.';
      } else if (lower.includes('anxious') || lower.includes('worry') || lower.includes('stress')) {
        sentiment = 'Anxious';
        moodScore = 5;
        caregiverFlag = false;
        aiFeedback = 'Try a 5-minute deep breathing exercise or gentle stretching session to relieve anxiety.';
      }

      const dateStr = new Date().toISOString().split('T')[0];

      try {
        await pool.query(
          'INSERT INTO journal_logs (user_id, journal_text, sentiment, mood_score, caregiver_flag, ai_feedback, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.userId, trimmedText, sentiment, moodScore, caregiverFlag ? 1 : 0, aiFeedback, dateStr]
        );
      } catch (dbErr) {
        console.warn('DB log warning:', dbErr.message);
      }

      return res.json({
        success: true,
        data: {
          sentiment: sentiment,
          moodScore: moodScore,
          caregiverFlag: caregiverFlag,
          aiFeedback: aiFeedback
        }
      });
    } catch (err) {
      console.error('Analyze journal error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze journal entry'
      });
    }
  }

  /**
   * Save Cognitive Game Scores
   */
  static async saveGameScore(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { gameType, score, durationSeconds } = req.body || {};
      const dateStr = new Date().toISOString().split('T')[0];
      const parsedScore = parseInt(score, 10) || 100;
      const duration = parseInt(durationSeconds, 10) || 60;

      try {
        await pool.query(
          'INSERT INTO cognitive_game_scores (user_id, game_type, score, duration_seconds, date) VALUES (?, ?, ?, ?, ?)',
          [req.userId, (gameType || 'Memory Match').trim(), parsedScore, duration, dateStr]
        );
      } catch (dbErr) {
        console.warn('DB log warning:', dbErr.message);
      }

      let performance = 'Excellent Memory Sharpness 🌟';
      if (parsedScore < 50) performance = 'Keep Practicing! 🧠';

      return res.json({
        success: true,
        message: 'Cognitive game score saved',
        data: {
          performance: performance,
          cognitiveIndex: Math.min(100, Math.round(parsedScore * 1.2))
        }
      });
    } catch (err) {
      console.error('Save game score error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to save cognitive score'
      });
    }
  }
}

module.exports = AiController;
