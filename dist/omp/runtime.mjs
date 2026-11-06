import {readFileSync} from 'node:fs';
import {ensurePayloadInstructions} from './payload.mjs';

const registrations = new WeakSet();
const STATE = 'gpt-with-taste:state';
const STEER = 'gpt-with-taste:steer';
const OPEN = '<gpt-with-taste>';
const block = (texts, role) => `${OPEN}\n${texts[role].trim()}\n</gpt-with-taste>`;
function overrides(ctx) {
  return ctx.sessionManager.getBranch().findLast(entry => entry.type === 'custom' && entry.customType === STATE)?.data ?? {};
}
function report(ctx, text, level = 'info') {
  if (ctx.hasUI) ctx.ui.notify(text, level);
  else console.error(`GPT with Taste: ${text}`);
}
export function completedTask(event) {
  const details = event.details;
  return event.toolName === 'task' && !event.isError && !details?.async &&
    Array.isArray(details?.results) && details.results.length > 0 &&
    details.results.every(result => result.exitCode === 0 && !result.aborted && result.error === undefined);
}
export function completedDelivery(message) {
  return message.role === 'custom' && message.customType === 'async-result' && message.attribution === 'agent' &&
    Array.isArray(message.details?.jobs) && message.details.jobs.some(job => job.type === 'task' && job.status === 'completed');
}
export function createTasteExtension({role = 'auto', providers, modelIdPattern = /^gpt-/} = {}) {
  if (!['auto', 'main', 'sub', 'independent'].includes(role)) throw new Error('GPT with Taste role must be auto, main, sub or independent');
  return function tasteExtension(pi) {
    if (registrations.has(pi)) throw new Error('Load only one GPT with Taste entry per OMP session');
    registrations.add(pi);
    const manifest = JSON.parse(readFileSync(new URL('./texts.json', import.meta.url), 'utf8'));
    const texts = Object.fromEntries(Object.entries(manifest).map(([key, file]) => {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8').trim();
      if (!text) throw new Error(`Empty GPT with Taste source: ${file}`);
      return [key, text];
    }));
    const decision = ctx => {
      if (role === 'auto' && !['main', 'sub'].includes(ctx.agent?.kind))
        throw new Error('GPT with Taste requires OMP 18.11.0 agent identity; upgrade OMP or configure an explicit role');
      // Factories are rebound into native children; a root role choice cannot
      // turn a real Task or /tan child into Main or Independent.
      const selectedRole = ctx.agent?.kind === 'sub' ? 'sub' : role === 'auto' ? ctx.agent.kind : role;
      const state = overrides(ctx);
      modelIdPattern.lastIndex = 0;
      const active = state.enabled !== false && !!ctx.model && (providers === undefined || providers.includes(ctx.model.provider)) && modelIdPattern.test(ctx.model.id);
      modelIdPattern.lastIndex = 0;
      return {role: selectedRole, active, steering: state.steering !== false && selectedRole !== 'independent'};
    };
    let warned = false;
    pi.on('before_agent_start', (event, ctx) => {
      const current = decision(ctx);
      // Only replace our own separate block; preserve every host block, including
      // live tools, project context, safety guidance and per-spawn assignments.
      const systemPrompt = event.systemPrompt.filter(part => !part.startsWith(`${OPEN}\n`));
      if (current.active) systemPrompt.push(block(texts, current.role));
      return {systemPrompt};
    });
    pi.on('context', (event, ctx) => {
      const current = decision(ctx);
      const messages = event.messages.filter(message => !(message.role === 'custom' && message.customType === STEER));
      if (!current.active || !current.steering) return {messages};
      const lastAssistant = messages.findLastIndex(message => message.role === 'assistant');
      return {messages: messages.flatMap((message, index) => {
        let route;
        if (index > lastAssistant) {
          if (message.role === 'user') route = current.role === 'sub' ? 'sub' : 'user';
          else if (current.role === 'main' && completedDelivery(message)) route = 'agent';
        }
        if (!route) return [message];
        const key = {user: 'userSteer', sub: 'subSteer', agent: 'agentSteer'}[route];
        return [message, {role: 'custom', customType: STEER,
          content: `<gpt-with-taste-${route}-steer>\n${texts[key].trim()}\n</gpt-with-taste-${route}-steer>`,
          display: false, details: {route}, timestamp: message.timestamp}];
      })};
    });
    pi.on('tool_result', (event, ctx) => {
      const current = decision(ctx);
      if (current.active && current.steering && current.role === 'main' && completedTask(event))
        return {additionalContext: texts.agentSteer};
    });
    pi.on('before_provider_request', (event, ctx) => {
      const current = decision(ctx);
      if (!current.active) return;
      const result = ensurePayloadInstructions(event.payload, block(texts, current.role));
      if (!result.supported && !warned) report(ctx,
        'Final-request guard cannot inspect this payload format. OMP system-block augmentation remains active; forced prompt replacement needs a provider-specific guard.', 'warning');
      warned = !result.supported;
      return result.payload;
    });
    pi.registerCommand('taste', {
      description: 'GPT with Taste: status, on, off, steer on, steer off, reset',
      getArgumentCompletions(argumentPrefix) {
        const items = [
          {value: 'status', label: 'status', description: 'Show adapter status'},
          {value: 'on', label: 'on', description: 'Enable the adapter'},
          {value: 'off', label: 'off', description: 'Disable the adapter'},
          {value: 'steer on', label: 'steer on', description: 'Enable steering reminders'},
          {value: 'steer off', label: 'steer off', description: 'Disable steering reminders'},
          {value: 'reset', label: 'reset', description: 'Reset branch-local overrides'},
        ].filter(item => item.value.startsWith(argumentPrefix));
        return items.length > 0 ? items : null;
      },
      handler: async (args, ctx) => {
        const command = args.trim() || 'status';
        const state = {...overrides(ctx)};
        if (command === 'on' || command === 'off') state.enabled = command === 'on';
        else if (command === 'steer on' || command === 'steer off') state.steering = command === 'steer on';
        else if (!['status', 'reset'].includes(command)) {
          report(ctx, 'Usage: /taste status|on|off|steer on|steer off|reset', 'warning');
          return;
        }
        if (command !== 'status') pi.appendEntry(STATE, command === 'reset' ? {} : state);
        const current = decision(ctx);
        report(ctx, `Role: ${current.role}\nActive: ${current.active}\nSteering: ${current.steering}\nSource: ${new URL('./texts.json', import.meta.url).pathname}`);
      },
    });
  };
}
export default createTasteExtension();
