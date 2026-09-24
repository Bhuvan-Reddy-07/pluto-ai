/**
 * Pluto AI - Conversation & Task Memory
 * Manages long-term context, step logs, persistent notes, and final task summarization.
 */

import { Storage } from '../shared/storage.js';
import { ProviderRegistry } from '../providers/registry.js';
import { Prompts } from '../shared/prompts.js';

export class Memory {
  static notesStore = {};

  static addNote(conversationId, fact) {
    if (!this.notesStore[conversationId]) {
      this.notesStore[conversationId] = [];
    }
    this.notesStore[conversationId].push({
      fact,
      timestamp: Date.now()
    });
  }

  static getNotes(conversationId) {
    return (this.notesStore[conversationId] || []).map(n => n.fact);
  }

  /**
   * Summarizes the entire completed task for the user
   */
  static async summarizeTask(goal, actionHistory, options = {}) {
    try {
      const adapter = await ProviderRegistry.getAdapter(options.provider);

      const historyFormatted = actionHistory.map((h, i) => {
        const act = h.action ? `[${h.action.skill}] target=${h.action.target || ''} value=${h.action.value || ''}` : 'action';
        return `Step ${i + 1}: ${act} -> ${h.observed_change || h.details || 'ok'}`;
      }).join('\n');

      const notes = this.getNotes(options.conversationId);
      const notesFormatted = notes.length > 0 ? `\n\nNotes Captured:\n${notes.map(n => `- ${n}`).join('\n')}` : '';

      const prompt = `
User's Original Goal: ${goal}

Executed Actions & Results:
${historyFormatted || 'No recorded actions.'}${notesFormatted}

Based on the execution history and captured notes, provide a concise and helpful markdown summary of what was accomplished, the key findings or answers, and any relevant details.
`.trim();

      const messages = [{ role: 'user', content: prompt }];
      const summary = await adapter.chat(messages, {
        systemPrompt: Prompts.SUMMARIZER,
        model: options.model
      });

      return summary;
    } catch (err) {
      console.warn('[Pluto Memory] Summarizer error, falling back to basic summary:', err);
      return `### Task Completed\n\n- **Goal**: ${goal}\n- **Total Actions**: ${actionHistory.length}\n- All planned steps completed successfully.`;
    }
  }

  /**
   * Save task record to conversation history in storage
   */
  static async recordTaskCompletion(conversationId, taskData) {
    await Storage.saveConversation({
      id: conversationId,
      timestamp: Date.now(),
      task: taskData
    });
  }
}
