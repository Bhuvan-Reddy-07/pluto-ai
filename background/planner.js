/**
 * Pluto AI - Strategic Planner
 * Decomposes complex user goals into an ordered array of verifiable execution steps.
 */

import { ProviderRegistry } from '../providers/registry.js';
import { Prompts } from '../shared/prompts.js';
import { NLPEngine } from '../shared/nlp-engine.js';
import { TaskPlanner } from '../shared/task-planner.js';

export class Planner {
  /**
   * Generates a sequential execution plan
   */
  static async createPlan(tabId, goal, options = {}) {
    const normGoal = NLPEngine.normalizeText(goal);

    // 0. Instant deterministic plan check for high-confidence intents (YouTube, Docs, Scholar, Wiki, Auth)
    try {
      const deterministicMilestones = TaskPlanner.decomposeGoal(normGoal, options.currentUrl || '');
      if (deterministicMilestones && deterministicMilestones.length > 1 && deterministicMilestones[0].type !== 'perceive') {
        return {
          summary: `Optimized Structured Plan: ${NLPEngine.classifyIntent(normGoal).intent}`,
          steps: deterministicMilestones.map((m, idx) => ({
            step: idx + 1,
            description: `${m.title}: ${m.description}`,
            done_condition: `Milestone #${idx + 1} satisfied`
          }))
        };
      }
    } catch (e) {
      console.warn('[Pluto Planner] TaskPlanner fallback to LLM:', e);
    }

    // 1. Ensure scripts are injected and get condensed DOM
    await this.ensureInjected(tabId);

    let domSummary = 'No page DOM available (blank or restricted tab)';
    try {
      const domResult = await chrome.tabs.sendMessage(tabId, {
        type: 'GET_CONDENSED_DOM',
        payload: { maxElements: 60 }
      });
      if (domResult?.success && domResult.condensedText) {
        domSummary = `URL: ${domResult.url}\nTitle: ${domResult.title}\nInteractive Elements:\n${domResult.condensedText}`;
      }
    } catch (e) {
      console.warn('[Pluto Planner] Failed to get condensed DOM for planning:', e);
    }

    const adapter = await ProviderRegistry.getAdapter(options.provider);

    const planningPrompt = `
User Goal: "${goal}"

Current Tab Context:
${domSummary}

Break this goal down into a logical, sequential plan. Output strict JSON matching the schema.
`.trim();

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const responseText = await adapter.chat([{ role: 'user', content: planningPrompt }], {
          systemPrompt: Prompts.PLANNER,
          json: true,
          temperature: 0.1,
          model: options.model
        });

        const parsed = this.parseJsonSafely(responseText);
        if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          // Normalize steps
          const steps = parsed.steps.map((s, idx) => ({
            step: s.step || idx + 1,
            description: s.description || `Step ${idx + 1}`,
            done_condition: s.done_condition || 'Action completed successfully'
          }));

          return {
            summary: parsed.summary || 'Executing task plan',
            steps
          };
        }
      } catch (err) {
        if (attempts >= 2) {
          console.error('[Pluto Planner] Planning failed, falling back to default plan:', err);
        }
      }
    }

    // Default fallback single/two-step plan
    return {
      summary: 'Execute task directly',
      steps: [
        {
          step: 1,
          description: `Navigate or interact to achieve: ${goal.slice(0, 60)}`,
          done_condition: 'Goal satisfied on the page'
        }
      ]
    };
  }

  static async ensureInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/dom-condenser.js', 'content/resolver.js', 'content/content.js']
      });
    } catch (err) {
      console.warn('[Pluto Planner] Script injection warning:', err);
    }
  }

  static parseJsonSafely(raw) {
    let text = (raw || '').trim();
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');

    try {
      return JSON.parse(text);
    } catch (e) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(text.substring(start, end + 1));
      }
      return null;
    }
  }
}
