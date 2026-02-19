import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../page';

const mockPush = vi.fn();
const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockVerifyBeforeUpdateEmail = vi.fn().mockResolvedValue(undefined);

const mockUser = {
  displayName: 'Old Name',
  email: 'user@example.com',
} as unknown as import('firebase/auth').User;

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  verifyBeforeUpdateEmail: (...args: unknown[]) => mockVerifyBeforeUpdateEmail(...args),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api-client', () => ({
  fetchWithAuth: vi.fn().mockRejectedValue(new Error('API Error')),
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));

describe('ProfilePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('Save Changes を押すと updateProfile → refreshUser → トップへ遷移すること', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Old Name' });
    });
    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('updateProfile が失敗した場合はエラーメッセージを表示し、トップへ遷移しないこと', async () => {
    const { FirebaseError } = await import('firebase/app');
    mockUpdateProfile.mockRejectedValueOnce(new FirebaseError('auth/error', 'Firebase error'));

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to update:/)).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('FirebaseError でない例外の場合は "An unexpected error occurred." を表示すること', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('Network error'));

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
    });
  });
});
