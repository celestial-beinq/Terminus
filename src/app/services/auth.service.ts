import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

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
  private readonly supabase = inject(SupabaseService);

  private readonly userSignal = signal<AuthUser | null>(this.restoreSession());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly currentRole = computed(() => this.userSignal()?.role ?? null);
  readonly isLiveAuth = this.supabase.isLiveConnected;

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

  constructor() {
    this.initSupabaseAuthListener();
  }

  async signInAsync(
    email: string,
    password: string,
    selectedRole?: UserRole | 'auto',
  ): Promise<{ ok: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid work email address.' };
    }
    if (password.trim().length < 4) {
      return { ok: false, error: 'Password must be at least 4 characters.' };
    }

    const client = await this.supabase.ensureClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        return { ok: false, error: error?.message ?? 'Invalid credentials.' };
      }

      await this.loadProfileFromSupabase(data.user.id, cleanEmail);
      return { ok: true };
    }

    return this.login(cleanEmail, password, selectedRole);
  }

  async signUpAsync(
    email: string,
    password: string,
    fullName: string,
    organization: string,
    role: UserRole,
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid work email address.' };
    }
    if (password.trim().length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!fullName.trim()) {
      return { ok: false, error: 'Enter your full name.' };
    }

    const client = await this.supabase.ensureClient();
    if (client) {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            organization: organization.trim() || 'Independent Shipper',
            role,
            hub_locode: 'NLRTM',
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.session && data.user) {
        await this.loadProfileFromSupabase(data.user.id, cleanEmail);
        return { ok: true };
      }

      return {
        ok: true,
        message: 'Account created. Check your inbox to confirm your email before signing in.',
      };
    }

    const localUser: AuthUser = {
      id: `USR-${Math.floor(400 + Math.random() * 500)}`,
      name: fullName.trim(),
      email: cleanEmail,
      role,
      organization: organization.trim() || DEMO_USERS[role].organization,
      hub: DEMO_USERS[role].hub,
      initials: this.extractInitials(fullName.trim()),
    };
    this.setSession(localUser);
    return { ok: true };
  }

  async resetPasswordAsync(email: string): Promise<string> {
    const cleanEmail = email.trim();
    const client = this.supabase.client();
    if (client && cleanEmail) {
      const { error } = await client.auth.resetPasswordForEmail(cleanEmail);
      return error
        ? `Reset failed: ${error.message}`
        : `Password reset link sent to ${cleanEmail}.`;
    }
    const target = cleanEmail || 'your registered work email';
    return `Access reset instructions queued for ${target}.`;
  }

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

  async toggleAccountStatus(accountId: string): Promise<void> {
    let nextActive = true;
    this.managedAccounts.update((accounts) =>
      accounts.map((acc) => {
        if (acc.id !== accountId) {
          return acc;
        }
        nextActive = !acc.active;
        return { ...acc, active: nextActive };
      }),
    );

    const client = this.supabase.client();
    if (client && /^[0-9a-f-]{36}$/i.test(accountId)) {
      await client.from('profiles').update({ active: nextActive }).eq('id', accountId);
    }
  }

  async logout(): Promise<void> {
    const client = await this.supabase.ensureClient();
    if (client) {
      await client.auth.signOut();
    }
    this.userSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.router.navigate(['/login']);
  }

  private initSupabaseAuthListener(): void {
    void this.supabase.ensureClient().then((client) => {
      if (!client) {
        return;
      }

      void client.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          void this.loadProfileFromSupabase(data.session.user.id, data.session.user.email ?? '');
        }
      });

      client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          void this.loadProfileFromSupabase(session.user.id, session.user.email ?? '');
        } else {
          this.userSignal.set(null);
        }
      });
    });
  }

  private async loadProfileFromSupabase(userId: string, fallbackEmail: string): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }

    const { data } = await client
      .from('profiles')
      .select('id, email, full_name, role, organization, hub_locode')
      .eq('id', userId)
      .maybeSingle();

    const role = (data?.role as UserRole) ?? 'customer';
    const name = data?.full_name || this.formatNameFromEmail(fallbackEmail);
    const user: AuthUser = {
      id: data?.id ?? userId,
      name,
      email: data?.email ?? fallbackEmail,
      role,
      organization: data?.organization ?? DEMO_USERS[role].organization,
      hub: data?.hub_locode ?? DEMO_USERS[role].hub,
      initials: this.extractInitials(name),
    };
    this.setSession(user);

    if (role === 'admin' || role === 'staff') {
      const { data: profilesList } = await client
        .from('profiles')
        .select('id, email, full_name, role, organization, hub_locode, active')
        .order('created_at', { ascending: false });

      if (profilesList && profilesList.length > 0) {
        this.managedAccounts.set(
          profilesList.map((row) => ({
            id: row.id,
            name: row.full_name,
            email: row.email,
            role: row.role as UserRole,
            organization: row.organization,
            hub: row.hub_locode,
            active: row.active,
          })),
        );
      }
    }
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

  private extractInitials(nameOrEmail: string): string {
    const parts = nameOrEmail.trim().split(/[\s._@-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || 'OP').toUpperCase();
  }
}
