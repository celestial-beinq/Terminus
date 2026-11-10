import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export type UserRole = 'customer' | 'dealer' | 'staff' | 'admin';
export type PublicSignupRole = 'customer' | 'dealer';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

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
  approvalStatus: ApprovalStatus;
  businessRegNumber?: string;
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
  private readonly liveSessionSignal = signal<boolean>(false);
  private profilesChannelSubscribed = false;

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly currentRole = computed(() => this.userSignal()?.role ?? null);
  readonly isLiveAuth = this.supabase.isLiveConnected;
  readonly hasLiveSession = this.liveSessionSignal.asReadonly();

  readonly managedAccounts = signal<ManagedAccount[]>([
    { ...DEMO_USERS.customer, active: true, approvalStatus: 'approved' },
    { ...DEMO_USERS.dealer, active: true, approvalStatus: 'approved', businessRegNumber: 'DE-HBG-44210' },
    { ...DEMO_USERS.staff, active: true, approvalStatus: 'approved' },
    { ...DEMO_USERS.admin, active: true, approvalStatus: 'approved' },
    {
      id: 'USR-119',
      name: 'Henrik Lindqvist',
      email: 'henrik@nordiccold.se',
      role: 'customer',
      organization: 'Nordic ColdFreight',
      hub: 'Hamburg (DEHAM)',
      active: true,
      approvalStatus: 'approved',
    },
    {
      id: 'USR-244',
      name: 'Sofia Mendes',
      email: 'sofia@atlanticdealers.br',
      role: 'dealer',
      organization: 'Atlantic Port Brokers',
      hub: 'Santos (BRSSZ)',
      active: false,
      approvalStatus: 'pending',
      businessRegNumber: 'BR-SSZ-88291',
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

      const accessCheck = await this.loadProfileFromSupabase(data.user.id, cleanEmail);
      if (!accessCheck.allowed) {
        await client.auth.signOut();
        this.liveSessionSignal.set(false);
        this.userSignal.set(null);
        return { ok: false, error: accessCheck.reason };
      }
      return { ok: true };
    }

    const localMatch = this.managedAccounts().find((a) => a.email.toLowerCase() === cleanEmail);
    if (localMatch && localMatch.approvalStatus === 'pending') {
      return {
        ok: false,
        error: 'Your Dealer business account is pending Admin verification.',
      };
    }
    if (localMatch && (!localMatch.active || localMatch.approvalStatus === 'rejected')) {
      return {
        ok: false,
        error: 'This account is suspended or awaiting approval.',
      };
    }

    return this.login(cleanEmail, password, selectedRole);
  }

  async signUpAsync(
    email: string,
    password: string,
    fullName: string,
    organization: string,
    role: PublicSignupRole,
    businessRegNumber = '',
  ): Promise<{ ok: boolean; pendingApproval?: boolean; message?: string; error?: string }> {
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
    if (role !== 'customer' && role !== 'dealer') {
      return {
        ok: false,
        error: 'Staff accounts are created by an Admin, and Admin accounts are created from the backend.',
      };
    }
    if (role === 'dealer' && !businessRegNumber.trim()) {
      return {
        ok: false,
        error: 'Dealers must enter a valid Business Registration / Freight License number.',
      };
    }

    const client = await this.supabase.ensureClient();
    if (client) {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            organization: organization.trim() || (role === 'dealer' ? 'Partner Freight Dealer' : 'Independent Shipper'),
            role,
            hub_locode: 'NLRTM',
            business_reg_number: businessRegNumber.trim(),
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (role === 'dealer') {
        if (data.session) {
          await client.auth.signOut();
        }
        return {
          ok: true,
          pendingApproval: true,
          message:
            'Dealer business registration submitted. An Admin must verify and approve your account before you can sign in.',
        };
      }

      if (data.session && data.user) {
        await this.loadProfileFromSupabase(data.user.id, cleanEmail);
        return { ok: true };
      }

      return {
        ok: true,
        message: 'Customer account created. Check your inbox to confirm your email before signing in.',
      };
    }

    const newId = `USR-${Math.floor(400 + Math.random() * 500)}`;
    if (role === 'dealer') {
      const pendingDealer: ManagedAccount = {
        id: newId,
        name: fullName.trim(),
        email: cleanEmail,
        role: 'dealer',
        organization: organization.trim() || 'Partner Freight Dealer',
        hub: 'NLRTM',
        active: false,
        approvalStatus: 'pending',
        businessRegNumber: businessRegNumber.trim(),
      };
      this.managedAccounts.update((list) => [pendingDealer, ...list]);
      return {
        ok: true,
        pendingApproval: true,
        message:
          'Dealer business registration submitted. An Admin must verify and approve your account before sign-in.',
      };
    }

    const localCustomer: AuthUser = {
      id: newId,
      name: fullName.trim(),
      email: cleanEmail,
      role: 'customer',
      organization: organization.trim() || DEMO_USERS.customer.organization,
      hub: DEMO_USERS.customer.hub,
      initials: this.extractInitials(fullName.trim()),
    };
    this.managedAccounts.update((list) => [
      { ...localCustomer, active: true, approvalStatus: 'approved' },
      ...list,
    ]);
    this.liveSessionSignal.set(false);
    this.setSession(localCustomer);
    return { ok: true };
  }

  async createStaffByAdmin(payload: {
    fullName: string;
    email: string;
    password: string;
    organization: string;
    hubLocode: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Only an authenticated Admin can create Staff accounts.' };
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid staff work email.' };
    }
    if (payload.password.trim().length < 6) {
      return { ok: false, error: 'Temporary password must be at least 6 characters.' };
    }
    if (!payload.fullName.trim()) {
      return { ok: false, error: 'Staff full name is required.' };
    }

    const client = await this.supabase.ensureClient();
    if (client && this.hasLiveSession()) {
      const { data, error } = await client.rpc('admin_create_staff', {
        p_email: cleanEmail,
        p_password: payload.password,
        p_full_name: payload.fullName.trim(),
        p_organization: payload.organization.trim() || 'Terminus Port Operations',
        p_hub_locode: payload.hubLocode || 'NLRTM',
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data) {
        const created: ManagedAccount = {
          id: data.id,
          name: data.full_name,
          email: data.email,
          role: 'staff',
          organization: data.organization,
          hub: data.hub_locode,
          active: true,
          approvalStatus: 'approved',
        };
        this.managedAccounts.update((list) => [created, ...list]);
      }
      return { ok: true };
    }

    const createdLocal: ManagedAccount = {
      id: `STF-${Math.floor(320 + Math.random() * 600)}`,
      name: payload.fullName.trim(),
      email: cleanEmail,
      role: 'staff',
      organization: payload.organization.trim() || 'Terminus Port Operations',
      hub: payload.hubLocode || 'NLRTM',
      active: true,
      approvalStatus: 'approved',
    };
    this.managedAccounts.update((list) => [createdLocal, ...list]);
    return { ok: true };
  }

  async verifyDealer(accountId: string, decision: 'approved' | 'rejected'): Promise<void> {
    if (this.currentRole() !== 'admin') {
      return;
    }

    const nextActive = decision === 'approved';
    this.managedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === accountId
          ? { ...acc, approvalStatus: decision, active: nextActive }
          : acc,
      ),
    );

    const client = this.supabase.client();
    if (client && /^[0-9a-f-]{36}$/i.test(accountId)) {
      await client
        .from('profiles')
        .update({ approval_status: decision, active: nextActive })
        .eq('id', accountId);
    }
  }

  async resetPasswordAsync(email: string): Promise<string> {
    const cleanEmail = email.trim();
    const client = await this.supabase.ensureClient();
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

    this.liveSessionSignal.set(false);
    this.setSession(user);
    return { ok: true };
  }

  loginAsDemo(role: UserRole): void {
    this.liveSessionSignal.set(false);
    this.setSession({ ...DEMO_USERS[role] });
  }

  switchRole(role: UserRole): void {
    this.liveSessionSignal.set(false);
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
    this.liveSessionSignal.set(false);
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
          this.liveSessionSignal.set(false);
          this.userSignal.set(null);
        }
      });
    });
  }

  private async loadProfileFromSupabase(
    userId: string,
    fallbackEmail: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const client = this.supabase.client();
    if (!client) {
      return { allowed: true };
    }

    const { data } = await client
      .from('profiles')
      .select('id, email, full_name, role, organization, hub_locode, active, approval_status')
      .eq('id', userId)
      .maybeSingle();

    if (data && data.approval_status === 'pending') {
      return {
        allowed: false,
        reason: 'Your Dealer business registration is pending Admin verification.',
      };
    }

    if (data && (!data.active || data.approval_status === 'rejected')) {
      return {
        allowed: false,
        reason: 'Your account is suspended or not approved for access.',
      };
    }

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
    this.liveSessionSignal.set(true);
    this.setSession(user);

    if (role === 'admin' || role === 'staff') {
      await this.fetchManagedAccounts();
    }

    if (role === 'admin' && !this.profilesChannelSubscribed) {
      this.profilesChannelSubscribed = true;
      client
        .channel('terminus-admin-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          void this.fetchManagedAccounts();
        })
        .subscribe();
    }

    return { allowed: true };
  }

  private async fetchManagedAccounts(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }

    const { data: profilesList } = await client
      .from('profiles')
      .select('id, email, full_name, role, organization, hub_locode, active, approval_status, business_reg_number')
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
          approvalStatus: (row.approval_status as ApprovalStatus) ?? 'approved',
          businessRegNumber: row.business_reg_number ?? undefined,
        })),
      );
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
