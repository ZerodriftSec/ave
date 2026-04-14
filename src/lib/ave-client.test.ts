import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchAveRisk } from "./ave-client";

const MOCK_API_KEY = "test-api-key";

describe("fetchAveRisk", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.AVE_API_KEY = MOCK_API_KEY;
  });

  afterEach(() => {
    delete process.env.AVE_API_KEY;
  });

  it("throws if no API key is provided and env is not set", async () => {
    delete process.env.AVE_API_KEY;
    await expect(fetchAveRisk("0x1", "eth", "")).rejects.toThrow("AVE_API_KEY not configured");
  });

  it("uses explicitly passed apiKey over env", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 1, data: { risk_score: 42 } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchAveRisk("0xABC", "bsc", "explicit-key");

    // Check X-API-KEY header
    const calls = mockFetch.mock.calls;
    for (const call of calls) {
      expect(call[1].headers["X-API-KEY"]).toBe("explicit-key");
    }
  });

  it("fetches all 3 endpoints in parallel and returns unwrapped data", async () => {
    const callLog: string[] = [];
    const mockFetch = vi.fn((url: string) => {
      callLog.push(url);
      if (url.includes("/contracts/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 1, data: { risk_score: 50, owner: "0x1" } }),
        });
      }
      if (url.includes("/tokens/top100/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 1, data: [{ address: "0xholder" }] }),
        });
      }
      if (url.includes("/tokens/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 1, data: { name: "TestToken", symbol: "TST" } }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ status: 0 }) });
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchAveRisk("0xABC", "eth");

    // 3 endpoints called
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Correct tokenId format
    expect(callLog[0]).toContain("0xABC-eth");
    expect(callLog[1]).toContain("0xABC-eth");
    expect(callLog[2]).toContain("0xABC-eth");

    // Data unwrapped
    expect(result.risk).toEqual({ risk_score: 50, owner: "0x1" });
    expect(result.token).toEqual({ name: "TestToken", symbol: "TST" });
    expect(result.holders).toEqual([{ address: "0xholder" }]);
  });

  it("returns null for endpoints where status !== 1", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 0, data: null }),
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchAveRisk("0xBAD", "eth");

    expect(result.risk).toBeNull();
    expect(result.token).toBeNull();
    expect(result.holders).toBeNull();
  });

  it("returns null for endpoints that reject", async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error("timeout")));
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchAveRisk("0xERR", "eth");

    expect(result.risk).toBeNull();
    expect(result.token).toBeNull();
    expect(result.holders).toBeNull();
  });

  it("returns null for endpoints that throw during json parse", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.reject(new Error("invalid json")),
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchAveRisk("0xPARSE", "eth");

    expect(result.risk).toBeNull();
    expect(result.token).toBeNull();
    expect(result.holders).toBeNull();
  });

  it("handles partial failures (some endpoints succeed, some fail)", async () => {
    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/contracts/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 1, data: { risk_score: 10 } }),
        });
      }
      return Promise.reject(new Error("fail"));
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchAveRisk("0xPARTIAL", "eth");

    expect(result.risk).toEqual({ risk_score: 10 });
    expect(result.token).toBeNull();
    expect(result.holders).toBeNull();
  });
});
