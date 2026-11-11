export const ASSISTANT_ASK_EVENT = "vaap-assistant:ask"

export function openAssistant(text = "") {
  window.dispatchEvent(new CustomEvent(ASSISTANT_ASK_EVENT, { detail: { text } }))
}
