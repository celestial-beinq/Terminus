import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'customer' | 'dealer' | 'staff' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  hub: string;
  initials: string;
}

export interface ManagedAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  hub: string;
  active: boolean;
}

const STORAGE_KEY = 'terminus_auth_user';

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  customer: {
    id: 'USR-104',
    name: 'Elena Rostova',
    email: 'elena@lumenlogistics.com',
    role: 'customer',
    organization: 'Lumen Logistics™',
    hub: 'Rotterdam (NLRTM)',
    initials: 'ER',
  },
  dealer: {
    id: 'USR-208',
    name: 'Lukas Weber',
    email: 'lukas@eurogate-broker.de',
    role: 'dealer',
    organization: 'Eurogate Freight Dealers',
    hub: 'Hamburg (DEHAM)',
    initials: 'LW',
  },
  staff: {
    id: 'USR-312',
    name: 'Maya Lin',
    email: 'maya.lin@terminus.io',
    role: 'staff',
    organization: 'Terminus Port Operations',
    hub: 'Singapore Tuas (SGSIN)',
    initials: 'ML',
  },
  admin: {
    id: 'USR-001',
    name: 'Marcus Vance',
    email: 'admin@terminus.io',
    role: 'admin',
    organization: 'Terminus Global Control',
    hub: 'Global Network HQ',
    initials: 'MV',
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private readonly userSignal = signal<AuthUser | null>(this.restoreSession());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly currentRole = computed(() => this.userSignal()?.role ?? null);

  readonly managedAccounts = signal<ManagedAccount[]>([
    { ...DEMO_USERS.customer, active: true },
    { ...DEMO_USERS.dealer, active: true },
    { ...DEMO_USERS.staff, active: true },
    { ...DEMO_USERS.admin, active: true },
    {
      id: 'USR-119',
      name: 'Henrik Lindqvist',
      email: 'henrik@nordiccold.se',
      role: 'customer',
      organization: 'Nordic ColdFreight',
      hub: 'Hamburg (DEHAM)',
      active: true,
    },
    {
      id: 'USR-244',
      name: 'Sofia Mendes',
      email: 'sofia@atlanticdealers.br',
      role: 'dealer',
      organization: 'Atlantic Port Brokers',
      hub: 'Santos (BRSSZ)',
      active: true,
    },
  ]);

  login(
    email: string,
    password: string,
    selectedRole?: UserRole | 'auto',
  ): { ok: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid work email address.' };
    }
    if (password.trim().length < 4) {
      return { ok: false, error: 'Password must be at least 4 characters.' };
    }

    const resolvedRole = this.resolveRole(cleanEmail, selectedRole);
    const preset = DEMO_USERS[resolvedRole];
    const matchedDemo = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === cleanEmail,
    );

    const user: AuthUser = matchedDemo
      ? { ...matchedDemo }
      : {
          id: `USR-${Math.floor(400 + Math.random() * 500)}`,
          name: this.formatNameFromEmail(cleanEmail),
          email: cleanEmail,
          role: resolvedRole,
          organization: preset.organization,
          hub: preset.hub,
          initials: this.extractInitials(cleanEmail),
        };

    this.setSession(user);
    return { ok: true };
  }

  loginAsDemo(role: UserRole): void {
    this.setSession({ ...DEMO_USERS[role] });
  }

  switchRole(role: UserRole): void {
    this.setSession({ ...DEMO_USERS[role] });
  }

  toggleAccountStatus(accountId: string): void {
    this.managedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === accountId ? { ...acc, active: !acc.active } : acc,
      ),
    );
  }

  logout(): void {
    this.userSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.router.navigate(['/login']);
  }

  private setSession(user: AuthUser): void {
    this.userSignal.set(user);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  private restoreSession(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as AuthUser;
      return parsed && parsed.role ? parsed : null;
    } catch {
      return null;
    }
  }

  private resolveRole(email: string, selectedRole?: UserRole | 'auto'): UserRole {
    if (selectedRole && selectedRole !== 'auto') {
      return selectedRole;
    }
    if (email.includes('admin')) {
      return 'admin';
    }
    if (email.includes('staff') || email.includes('terminus.io') || email.includes('ops')) {
      return 'staff';
    }
    if (email.includes('dealer') || email.includes('broker')) {
      return 'dealer';
    }
    return 'customer';
  }

  private formatNameFromEmail(email: string): string {
    const local = email.split('@')[0] ?? 'Operator';
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private extractInitials(email: string): string {
    const parts = this.formatNameFromEmail(email).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || 'OP').toUpperCase();
  }
}

