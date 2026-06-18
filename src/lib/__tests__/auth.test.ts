import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const mockSet = vi.fn();
const mockGet = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockSet, get: mockGet })),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function importCreateSession() {
  vi.resetModules();
  const { createSession } = await import("@/lib/auth");
  return createSession;
}

async function importGetSession() {
  vi.resetModules();
  const { getSession } = await import("@/lib/auth");
  return getSession;
}

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    mockSet.mockClear();
    vi.unstubAllEnvs();
  });

  test("sets the auth-token cookie", async () => {
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [name] = mockSet.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("sets httpOnly on the cookie", async () => {
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  test("sets sameSite to lax", async () => {
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });

  test("sets path to /", async () => {
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("secure is false outside of production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("secure is true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(true);
  });

  test("token contains correct userId and email", async () => {
    const createSession = await importCreateSession();
    await createSession("user-42", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("token uses HS256 algorithm", async () => {
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");

    const [, token] = mockSet.mock.calls[0];
    const header = JSON.parse(atob(token.split(".")[0]));
    expect(header.alg).toBe("HS256");
  });

  test("token expires in 7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    const createSession = await importCreateSession();
    await createSession("user-1", "test@example.com");
    const after = Math.floor(Date.now() / 1000);

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysSec = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec - 5);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec + 5);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns null when cookie value is undefined", async () => {
    mockGet.mockReturnValue({ value: undefined });
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-1",
      email: "test@example.com",
      expiresAt: new Date().toISOString(),
    });
    mockGet.mockReturnValue({ value: token });
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
  });

  test("returns null for a malformed token", async () => {
    mockGet.mockReturnValue({ value: "not.a.valid.token" });
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns null for a token signed with a different secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);
    mockGet.mockReturnValue({ value: token });
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "test@example.com" },
      "-1s"
    );
    mockGet.mockReturnValue({ value: token });
    const getSession = await importGetSession();

    const result = await getSession();
    expect(result).toBeNull();
  });

  test("reads the auth-token cookie by name", async () => {
    mockGet.mockReturnValue(undefined);
    const getSession = await importGetSession();

    await getSession();
    expect(mockGet).toHaveBeenCalledWith("auth-token");
  });
});
