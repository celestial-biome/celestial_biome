import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthStatus from '../AuthStatus';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

import { useAuth } from '@/context/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

describe('AuthStatus', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ローディング中はローディング用のプレースホルダーを表示すること', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      displayName: null,
      loading: true,
      refreshUser: async () => {},
      userVersion: 0,
    });

    const { container } = render(<AuthStatus />);
    expect(screen.queryByText('Logged in as')).not.toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(container.querySelector('.h-16')).toBeInTheDocument();
  });

  it('未ログイン時は Login リンクを表示すること', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      displayName: null,
      loading: false,
      refreshUser: async () => {},
      userVersion: 0,
    });

    render(<AuthStatus />);
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
  });

  it('ログイン時は contextDisplayName を優先して表示すること', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        displayName: 'Old',
        email: 'user@example.com',
      } as unknown as import('firebase/auth').User,
      displayName: 'New Display Name',
      loading: false,
      refreshUser: async () => {},
      userVersion: 1,
    });

    render(<AuthStatus />);
    expect(screen.getByText('New Display Name')).toBeInTheDocument();
    expect(screen.getByText('Logged in as')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Config' })).toHaveAttribute('href', '/profile');
  });

  it('contextDisplayName がなくても user.displayName があれば表示すること', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        displayName: 'User Display',
        email: 'user@example.com',
      } as unknown as import('firebase/auth').User,
      displayName: null,
      loading: false,
      refreshUser: async () => {},
      userVersion: 0,
    });

    render(<AuthStatus />);
    expect(screen.getByText('User Display')).toBeInTheDocument();
  });

  it('displayName がどちらもなければ email を表示すること', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        displayName: null,
        email: 'fallback@example.com',
      } as unknown as import('firebase/auth').User,
      displayName: null,
      loading: false,
      refreshUser: async () => {},
      userVersion: 0,
    });

    render(<AuthStatus />);
    expect(screen.getByText('fallback@example.com')).toBeInTheDocument();
  });
});
