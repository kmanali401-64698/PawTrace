import os from "os";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

function isLocalHostname(hostname: string) {
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
}

/** First private IPv4 address of this machine (e.g. 192.168.1.20), preferring home Wi-Fi ranges. */
export function getLanAddress(): string | null {
    const candidates: string[] = [];
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
        // Skip virtual adapters (WSL, Hyper-V, Docker, VirtualBox, VPN tunnels)
        if (/vEthernet|WSL|Hyper-V|VirtualBox|VMware|docker|Loopback|tun|tap/i.test(name)) continue;
        for (const addr of addrs ?? []) {
            if (addr.family === "IPv4" && !addr.internal) candidates.push(addr.address);
        }
    }
    const rank = (ip: string) =>
        ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
    candidates.sort((a, b) => rank(a) - rank(b));
    return candidates.find((ip) => rank(ip) < 3) ?? null;
}

/**
 * The base URL a phone should open when it scans a PawTrace tag.
 * 1. NEXT_PUBLIC_APP_URL, if it is a real (non-localhost) address — use this when deployed.
 * 2. The host the owner is currently using, if it isn't localhost.
 * 3. In local development, this computer's Wi-Fi/LAN address so phones on the same network can reach it.
 */
export function getPublicBaseUrl(req: Request): { baseUrl: string; reachableFromPhones: boolean } {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
    if (configured) {
        try {
            if (!isLocalHostname(new URL(configured).hostname)) {
                return { baseUrl: configured, reachableFromPhones: true };
            }
        } catch {
            // ignore malformed value and fall through
        }
    }

    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    const hostUrl = new URL(`${proto}://${host}`);

    if (!isLocalHostname(hostUrl.hostname)) {
        return { baseUrl: hostUrl.origin, reachableFromPhones: true };
    }

    const lan = getLanAddress();
    if (lan) {
        const port = hostUrl.port ? `:${hostUrl.port}` : "";
        return { baseUrl: `${proto}://${lan}${port}`, reachableFromPhones: true };
    }

    return { baseUrl: hostUrl.origin, reachableFromPhones: false };
}
