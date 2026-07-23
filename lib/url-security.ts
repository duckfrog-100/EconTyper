import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const LOCAL_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".home", ".lan"];

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8")) return true;
  if (normalized.startsWith("2001:2:")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    return isIP(mapped) === 4 ? isBlockedIpv4(mapped) : true;
  }
  return false;
}

export function isBlockedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

export async function assertPublicUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid article URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only public HTTP and HTTPS URLs are supported.");
  }
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || LOCAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("This address is not publicly reachable.");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("This address is not publicly reachable.");
    return url;
  }

  let answers: LookupAddress[];
  try {
    answers = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The website address could not be resolved.");
  }

  if (!answers.length || answers.some(({ address }) => isBlockedIp(address))) {
    throw new Error("This address is not publicly reachable.");
  }

  return url;
}
