import { describe, expect, it } from "vitest";
import { isBlockedIp } from "@/lib/url-security";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "203.0.113.10",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("blocks %s", (address) => {
    expect(isBlockedIp(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows %s", (address) => {
    expect(isBlockedIp(address)).toBe(false);
  });
});
