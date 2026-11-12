import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryStore } from "../../src/core/services/memoryStore.js";

describe("IDE ownership across server restarts", () => {
  const originalToken = process.env.AGENTCHATBUS_OWNER_BOOT_TOKEN;
  let dir: string | null = null;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.AGENTCHATBUS_OWNER_BOOT_TOKEN;
    } else {
      process.env.AGENTCHATBUS_OWNER_BOOT_TOKEN = originalToken;
    }
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = null;
    }
  });

  it("grants ownership to the spawning IDE even when a previous owner was persisted", () => {
    dir = mkdtempSync(join(tmpdir(), "acb-ide-owner-"));
    const dbPath = join(dir, "bus.db");

    process.env.AGENTCHATBUS_OWNER_BOOT_TOKEN = "boot-1";
    const first = new MemoryStore(dbPath);
    const firstOwner = first.registerIde({
      instance_id: "ide-old",
      ide_label: "VSCode",
      claim_owner: true,
      owner_boot_token: "boot-1",
    });
    expect(firstOwner.is_owner).toBe(true);

    // Restart: a different IDE spawns a new process with a new boot token.
    process.env.AGENTCHATBUS_OWNER_BOOT_TOKEN = "boot-2";
    const second = new MemoryStore(dbPath);
    expect(second.getIdeStatus().owner_instance_id).toBe("ide-old");

    const wrongToken = second.registerIde({
      instance_id: "ide-intruder",
      ide_label: "VSCode",
      claim_owner: true,
      owner_boot_token: "boot-1",
    });
    expect(wrongToken.is_owner).toBe(false);

    const claimed = second.registerIde({
      instance_id: "ide-new",
      ide_label: "VSCode",
      claim_owner: true,
      owner_boot_token: "boot-2",
    });
    expect(claimed.is_owner).toBe(true);
    expect(claimed.can_shutdown).toBe(true);
    expect(claimed.owner_instance_id).toBe("ide-new");
  });
});
