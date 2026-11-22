// Adapted from SpadeLushen/pi-gpt-with-taste/src/payload.ts, MIT.
// Only append a missing block; preserve host instructions, tools and metadata.
const record = value => typeof value === 'object' && value !== null && !Array.isArray(value);
function instructionText(message) {
  if (!record(message) || !['system', 'developer'].includes(message.role)) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content.map(part => record(part) && ['text', 'input_text'].includes(part.type) &&
    typeof part.text === 'string' ? part.text : '').join('\n');
}
export function ensurePayloadInstructions(payload, block, {responsesHistory = false} = {}) {
  if (!record(payload)) return {supported: false};
  if (Array.isArray(payload.input)) {
    if (typeof payload.model !== 'string') return {supported: false};
    const existing = payload.instructions;
    if (existing != null && typeof existing !== 'string') return {supported: false};
    if ((typeof existing === 'string' && existing.includes(block)) ||
        payload.input.some(message => instructionText(message).includes(block))) return {supported: true};
    if (responsesHistory) {
      // A chained frame has only new items. The full frame already put the
      // block into history; a top-level instructions repair would not carry over.
      if (typeof payload.previous_response_id === 'string' && payload.previous_response_id.length > 0)
        return {supported: true};
      const firstOther = payload.input.findIndex(message => !['system', 'developer'].includes(message?.role));
      const index = firstOther === -1 ? payload.input.length : firstOther;
      const message = {type: 'message', role: 'developer', content: [{type: 'input_text', text: block}]};
      return {supported: true, payload: {...payload, input: payload.input.toSpliced(index, 0, message)}};
    }
    return {supported: true, payload: {...payload,
      instructions: existing ? `${existing}\n\n${block}` : block}};
  }
  if (Array.isArray(payload.messages)) {
    // TRAE identifies its route with config_name/model_name instead of model.
    if (typeof payload.model !== 'string' &&
        !(typeof payload.config_name === 'string' && typeof payload.model_name === 'string')) return {supported: false};
    const messages = payload.messages;
    if (messages.some(message => instructionText(message).includes(block))) return {supported: true};
    const index = messages.findIndex(message => record(message) && ['system', 'developer'].includes(message.role));
    const message = messages[index];
    if (!record(message)) return {supported: false};
    let content;
    if (typeof message.content === 'string') content = message.content ? `${message.content}\n\n${block}` : block;
    else if (Array.isArray(message.content)) content = [...message.content, {type: 'text', text: block}];
    else return {supported: false};
    const updated = messages.slice();
    updated[index] = {...message, content};
    return {supported: true, payload: {...payload, messages: updated}};
  }
  return {supported: false};
}
