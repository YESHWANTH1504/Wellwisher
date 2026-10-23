/**
 * PersonalTaskEngine
 * Manages prioritized personal tasks, subtasks, deadlines, and goals.
 */
class PersonalTaskEngine {
  constructor() {
    this.tasks = new Map();
  }

  createTask(userId, taskData) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const task = {
      id: taskId,
      userId,
      title: taskData.title,
      priority: taskData.priority || 'IMPORTANT', // URGENT, IMPORTANT, AT_RISK, NEXT, LATER, OPTIONAL
      deadline: taskData.deadline || null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.tasks.set(taskId, task);
    return task;
  }

  getTasks(userId, filter = {}) {
    return Array.from(this.tasks.values()).filter(t => {
      if (t.userId !== userId) return false;
      if (filter.status && t.status !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      return true;
    });
  }

  completeTask(userId, taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.userId === userId) {
      task.status = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      return task;
    }
    return null;
  }

  getPrioritizedSummary(userId) {
    const all = this.getTasks(userId, { status: 'PENDING' });
    return {
      urgent: all.filter(t => t.priority === 'URGENT'),
      important: all.filter(t => t.priority === 'IMPORTANT'),
      next: all.filter(t => t.priority === 'NEXT'),
      totalPending: all.length
    };
  }
}

module.exports = new PersonalTaskEngine();
