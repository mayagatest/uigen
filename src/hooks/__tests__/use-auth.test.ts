import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

async function importUseAuth() {
  vi.resetModules();
  const { useAuth } = await import("@/hooks/use-auth");
  return useAuth;
}

describe("useAuth — signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  test("calls signIn action with provided credentials", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("returns the result from the signIn action", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("returns error result when signIn action fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("sets isLoading to true during signIn and false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let signInPromise!: Promise<unknown>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when signIn throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signIn("user@example.com", "password123");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  test("calls signUp action with provided credentials", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "securepass");
  });

  test("returns the result from the signUp action", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "securepass");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("does not navigate when signUp fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "securepass");
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("resets isLoading after signUp regardless of outcome", async () => {
    mockSignUp.mockRejectedValue(new Error("Server error"));
    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signUp("user@example.com", "pass");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — post sign-in navigation (anon work)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a project from anon work and navigates to it", async () => {
    const anonMessages = [{ role: "user", content: "hello" }];
    const anonFsData = { "/index.tsx": "export default () => <div/>" };
    mockGetAnonWorkData.mockReturnValue({ messages: anonMessages, fileSystemData: anonFsData });
    mockSignIn.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonMessages,
        data: anonFsData,
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("does not use anon work when messages array is empty", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/existing-project");
  });

  test("clears anon work after creating the project", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [{ role: "user", content: "hi" }], fileSystemData: {} });
    mockSignIn.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "new-id" });

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockClearAnonWork).toHaveBeenCalled();
  });
});

describe("useAuth — post sign-in navigation (no anon work)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
  });

  test("navigates to the user's most recent project when one exists", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { id: "recent-project" },
      { id: "older-project" },
    ]);

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/recent-project");
  });

  test("creates a new project and navigates to it when user has no existing projects", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-project" });

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/brand-new-project");
  });

  test("navigates to new project after signUp when user has no projects", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "signup-project" });

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/signup-project");
  });

  test("navigates to most recent project after signUp when projects exist", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "user-project" }]);

    const useAuth = await importUseAuth();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/user-project");
  });
});
