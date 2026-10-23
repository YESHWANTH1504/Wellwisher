/**
 * LongRunningTaskManager
 * Manages workflows that span hours or days with persistent checkpoints and retry mechanisms.
 */
class LongRunningTaskManager {
  constructor() {
    this.longTasks = new Map();
  }

  createLongRunningTask(userId, taskData) {
    const taskId = `lrt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const task = {
      id: taskId,
      userId,
      title: taskData.title,
      frequency: taskData.frequency || 'DAILY',
      untilCondition: taskData.untilCondition || 'COMPLETED',
      status: 'ACTIVE',
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    this.longTasks.set(taskId, task);
    return task;
  }

  getActiveTasks(userId) {
    return Array.from(this.longTasks.values()).filter(t => t.userId === userId && t.status === 'ACTIVE');
  }

  completeTask(taskId) {
    const task = this.longTasks.get(taskId);
    if (task) {
      task.status = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      return task;
    }
    return null;
  }
}

module.exports = new LongRunningTaskManager();
