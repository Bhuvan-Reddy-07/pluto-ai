/**
 * DOM Action Executor
 * Injects and executes verified action commands (click, type, scroll, navigate, hover) in page context.
 */

import { BBox } from './capture';

export interface ActionTarget {
  selector?: string;
  tag_id?: string;
  text?: string;
  bbox?: BBox;
}

export interface ActionCommand {
  action: 'click' | 'type' | 'scroll' | 'navigate' | 'hover' | 'finish';
  target?: ActionTarget;
  value?: string;
  dx?: number;
  dy?: number;
  url?: string;
  thought?: string;
  confidence?: number;
}

export class ActionExecutor {
  public static async execute(tabId: number, actions: ActionCommand[]): Promise<{ success: boolean; executedCount: number }> {
    if (!actions || actions.length === 0) {
      return { success: true, executedCount: 0 };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (cmds: ActionCommand[]) => {
        for (const cmd of cmds) {
          console.log(`[PrivacyVisionAgent] Executing action: ${cmd.action}`, cmd);

          switch (cmd.action) {
            case 'click': {
              let el: HTMLElement | null = null;
              if (cmd.target?.selector) {
                el = document.querySelector(cmd.target.selector) as HTMLElement;
              }
              if (!el && cmd.target?.text) {
                const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
                el = (candidates.find(c => (c as HTMLElement).innerText?.includes(cmd.target!.text!)) as HTMLElement) || null;
              }
              if (!el && cmd.target?.bbox) {
                const x = cmd.target.bbox.x + cmd.target.bbox.w / 2;
                const y = cmd.target.bbox.y + cmd.target.bbox.h / 2;
                el = document.elementFromPoint(x, y) as HTMLElement;
              }

              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 150));
                el.click();
              }
              break;
            }

            case 'type': {
              let el: HTMLInputElement | null = null;
              if (cmd.target?.selector) {
                el = document.querySelector(cmd.target.selector) as HTMLInputElement;
              }
              if (!el && cmd.target?.bbox) {
                const x = cmd.target.bbox.x + cmd.target.bbox.w / 2;
                const y = cmd.target.bbox.y + cmd.target.bbox.h / 2;
                el = document.elementFromPoint(x, y) as HTMLInputElement;
              }

              if (el && cmd.value) {
                el.focus();
                el.value = cmd.value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
              break;
            }

            case 'scroll': {
              const dy = cmd.dy || 300;
              const dx = cmd.dx || 0;
              window.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
              break;
            }

            case 'navigate': {
              if (cmd.url) {
                window.location.href = cmd.url;
              }
              break;
            }

            case 'hover': {
              let el: HTMLElement | null = null;
              if (cmd.target?.selector) {
                el = document.querySelector(cmd.target.selector) as HTMLElement;
              }
              if (el) {
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              }
              break;
            }
          }

          // Delay between actions for visual validation
          await new Promise(r => setTimeout(r, 1200));
        }

        return true;
      },
      args: [actions]
    });

    return {
      success: true,
      executedCount: actions.length
    };
  }
}
