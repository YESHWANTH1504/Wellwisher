/**
 * PersonalGoalEngine
 * Manages user long-term goals and connects them to actionable tasks, calendar events, and routines.
 */
class PersonalGoalEngine {
  constructor() {
    this.goals = new Map();
  }

  createGoal(userId, goalData) {
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const goal = {
      id: goalId,
      userId,
      title: goalData.title,
      category: goalData.category || 'PROJECT', // FITNESS, LEARNING, CAREER, PROJECT, ROUTINE
      targetDate: goalData.targetDate || null,
      progressPercent: 0,
      status: 'ACTIVE',
      linkedTaskIds: [],
      createdAt: new Date().toISOString()
    };
    this.goals.set(goalId, goal);
    return goal;
  }

  getGoals(userId, filter = {}) {
    return Array.from(this.goals.values()).filter(g => {
      if (g.userId !== userId) return false;
      if (filter.status && g.status !== filter.status) return false;
      return true;
    });
  }

  updateProgress(goalId, progressPercent) {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.progressPercent = Math.min(100, Math.max(0, progressPercent));
      if (goal.progressPercent === 100) {
        goal.status = 'COMPLETED';
      }
      return goal;
    }
    return null;
  }
}

module.exports = new PersonalGoalEngine();
