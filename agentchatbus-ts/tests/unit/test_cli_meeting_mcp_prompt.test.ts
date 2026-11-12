import { describe, expect, it } from "vitest";
import { buildCliMcpMeetingPrompt } from "../../src/core/services/cliMeetingContextBuilder.js";
import { MemoryStore } from "../../src/core/services/memoryStore.js";

describe("buildCliMcpMeetingPrompt", () => {
  it("embeds the exact bus_connect credentials for the launched participant identity", () => {
    const store = new MemoryStore(":memory:");
    const participant = store.registerAgent({
      ide: "Codex",
      model: "Interactive CLI",
      display_name: "Codex Interactive",
    });
    const { thread } = store.createThread("Prompt Thread", undefined, undefined, {
      creatorAdminId: participant.id,
      creatorAdminName: participant.display_name || participant.name,
      applySystemPromptContentFilter: false,
    });

    const prompt = buildCliMcpMeetingPrompt({
      store,
      threadId: thread.id,
      participantAgentId: participant.id,
      participantDisplayName: participant.display_name,
      initialInstruction: "Introduce yourself briefly.",
      serverUrl: "http://127.0.0.1:39765",
      participantRole: "administrator",
    }).prompt;

    // The payload identifies the thread by name; the thread id is only offered as a fallback.
    expect(prompt).toContain("Call `bus_connect` with exactly this payload:");
    expect(prompt).toContain(`"thread_name": "Prompt Thread"`);
    expect(prompt).toContain(`"agent_id": "${participant.id}"`);
    expect(prompt).toContain(`"token": "${participant.token}"`);
    expect(prompt).toContain(`thread_id "${thread.id}"`);
  });
});
