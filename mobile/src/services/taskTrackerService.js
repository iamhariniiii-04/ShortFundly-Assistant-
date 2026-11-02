import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class TaskTrackerManager {
  async getTasks() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  async saveTasks(tasks) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(tasks));
    } catch (e) {}
  }

  // Voice parse: "Add task buy milk", "To-do haircut today", "Add to my list buy groceries"
  parseTaskQuery(query) {
    const q = query.toLowerCase().trim();
    const clean = q.replace(/^(?:hey assi|assi|please)?\s*(?:add task|new task|add to do|add to my list|to do|todo|create task)\s+/i, '');
    return clean || 'New Task';
  }

  async addTask(query, language = 'en') {
    const taskTitle = this.parseTaskQuery(query);
    const tasks = await this.getTasks();

    const newTask = {
      id: Date.now().toString(),
      title: taskTitle,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    await this.saveTasks(tasks);
    HapticService.onSuccess();

    let reply = `Added to your to-do list: "${taskTitle}".`;
    if (language === 'ta') {
      reply = `"${taskTitle}" உங்கள் பணிகளில் சேர்க்கப்பட்டது.`;
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, task: newTask, reply };
  }

  async readTasks(language = 'en') {
    const tasks = await this.getTasks();
    const pending = tasks.filter((t) => !t.completed);

    if (pending.length === 0) {
      let emptyMsg = 'You have no pending tasks on your to-do list.';
      if (language === 'ta') emptyMsg = 'உங்களுக்கு நிலுவையில் உள்ள பணிகள் எதுவும் இல்லை.';
      await SpeechService.speak(emptyMsg, { preferredLang: language });
      return { success: true, count: 0, reply: emptyMsg };
    }

    let reply = `You have ${pending.length} pending ${pending.length === 1 ? 'task' : 'tasks'}: `;
    pending.forEach((t, idx) => {
      reply += `${idx + 1}. ${t.title}. `;
    });

    if (language === 'ta') {
      reply = `உங்களுக்கு ${pending.length} பணிகள் உள்ளன: `;
      pending.forEach((t, idx) => {
        reply += `${idx + 1}. ${t.title}. `;
      });
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, count: pending.length, reply, tasks: pending };
  }

  async markTaskDone(query, language = 'en') {
    const tasks = await this.getTasks();
    const clean = (query || '').toLowerCase();

    // Look for matching task
    let target = tasks.find((t) => !t.completed && (clean.includes(t.title.toLowerCase()) || t.title.toLowerCase().includes(clean)));

    if (!target) {
      // Default to first pending task
      target = tasks.find((t) => !t.completed);
    }

    if (!target) {
      const emptyMsg = language === 'ta' ? 'முடிக்க வேண்டிய பணிகள் எதுவும் இல்லை.' : 'No pending tasks to mark as complete.';
      await SpeechService.speak(emptyMsg, { preferredLang: language });
      return { success: false, reply: emptyMsg };
    }

    target.completed = true;
    target.completedAt = new Date().toISOString();
    await this.saveTasks(tasks);
    HapticService.onSuccess();

    let reply = `Marked "${target.title}" as completed!`;
    if (language === 'ta') {
      reply = `"${target.title}" பணி முடிவடைந்ததாக குறிக்கப்பட்டது!`;
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, task: target, reply };
  }

  async clearCompleted(language = 'en') {
    const tasks = await this.getTasks();
    const remaining = tasks.filter((t) => !t.completed);
    await this.saveTasks(remaining);
    HapticService.onSuccess();

    const reply = language === 'ta' ? 'முடிவடைந்த பணிகள் நீக்கப்பட்டன.' : 'Cleared all completed tasks.';
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, reply };
  }
}

export const TaskTrackerService = new TaskTrackerManager();
