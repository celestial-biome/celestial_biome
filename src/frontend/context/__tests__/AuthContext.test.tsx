import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

// vi.mock はホイストされるため、モックで参照する変数は vi.hoisted で定義する
type MockUser = {
  displayName: string | null;
  email: string | null;
  reload: ReturnType<typeof vi.fn>;
};
const { mockAuth, authStateUserRef } = vi.hoisted(() => {
  const ref: { current: MockUser | null } = {
    current: {
      displayName: 'Old Name',
      email: 'user@example.com',
      reload: vi.fn().mockResolvedValue(undefined),
    },
  };
  return {
    mockAuth: {
      get currentUser() {
        return ref.current;
      },
    },
    authStateUserRef: ref,
  };
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (u: unknown) => void) => {
    callback(authStateUserRef.current);
    return () => {};
  }),
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
}));

function TestConsumer() {
  const { user, displayName, refreshUser } = useAuth();
  return (
    <div>
      <span data-testid="displayName">{displayName ?? 'null'}</span>
      <span data-testid="user-displayName">{user?.displayName ?? 'null'}</span>
      <button type="button" onClick={() => refreshUser()}>
        Refresh
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    authStateUserRef.current = {
      displayName: 'Old Name',
      email: 'user@example.com',
      reload: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('初期表示で onAuthStateChanged の user から displayName を設定すること', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('displayName')).toHaveTextContent('Old Name');
    });
    expect(screen.getByTestId('user-displayName')).toHaveTextContent('Old Name');
  });

  it('refreshUser 呼び出しで reload 後に displayName が最新になること', async () => {
    authStateUserRef.current!.reload = vi.fn().mockImplementation(async () => {
      if (authStateUserRef.current) authStateUserRef.current.displayName = 'New Name';
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('displayName')).toHaveTextContent('Old Name');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(screen.getByTestId('displayName')).toHaveTextContent('New Name');
    });
    expect(authStateUserRef.current?.reload).toHaveBeenCalled();
  });

  it('user が null のとき displayName も null になること', async () => {
    authStateUserRef.current = null;

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('displayName')).toHaveTextContent('null');
    });
  });
});
