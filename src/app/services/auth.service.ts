import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export type UserRole = 'customer' | 'dealer' | 'staff' | 'admin';
export type PublicSignupRole = 'customer' | 'dealer';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface NotificationPreferences {
  shipmentConfirmation: boolean;
  dispatchUpdates: boolean;
  portArrival: boolean;
  customsUpdates: boolean;
  deliveryNotifications: boolean;
  invoiceReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  shipmentConfirmation: true,
  dispatchUpdates: true,
  portArrival: true,
  customsUpdates: true,
  deliveryNotifications: true,
  invoiceReminders: true,
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  hub: string;
  initials: string;
  phone?: string;
  approvalStatus?: ApprovalStatus;
  businessRegNumber?: string;
  businessAddress?: string;
  taxId?: string;
  verificationDocName?: string;
  verificationDocUrl?: string;
  verificationSubmittedAt?: string;
  permissions?: string[];
  notificationPrefs?: NotificationPreferences;
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
  staffTitle?: string;
  permissions: string[];
  lastLoginAt?: string;
}

const STORAGE_KEY = 'terminus_auth_user';

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

  readonly managedAccounts = signal<ManagedAccount[]>([]);
  /** Session-only onboarding/re-issued temporary passwords for Staff (never persisted in Postgres or storage). */
  private readonly issuedStaffPasswordsSignal = signal<Record<string, string>>({});
  readonly issuedStaffPasswords = this.issuedStaffPasswordsSignal.asReadonly();

  constructor() {
    this.initSupabaseAuthListener();
  }

  async signInAsync(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid work email address.' };
    }
    if (password.trim().length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user) {
      return { ok: false, error: error?.message ?? 'Invalid email or password.' };
    }

    const accessCheck = await this.loadProfileFromSupabase(data.user.id, cleanEmail);
    if (!accessCheck.allowed) {
      await client.auth.signOut();
      this.liveSessionSignal.set(false);
      this.clearSession();
      return { ok: false, error: accessCheck.reason };
    }

    return { ok: true };
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
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          organization:
            organization.trim() ||
            (role === 'dealer' ? 'Partner Freight Dealer' : 'Independent Shipper'),
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
    if (!client || !this.hasLiveSession()) {
      return { ok: false, error: 'Live Admin session required to provision Staff.' };
    }

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
        staffTitle: 'Operations Specialist',
        permissions: ['shipments.read', 'shipments.update', 'customs.manage', 'gate_tasks.manage'],
      };
      this.managedAccounts.update((list) => [created, ...list]);
      this.issuedStaffPasswordsSignal.update((map) => ({
        ...map,
        [created.id]: payload.password,
      }));
    }
    return { ok: true };
  }

  async setStaffPasswordByAdmin(
    staffId: string,
    newPassword: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Only an authenticated Admin can issue staff passwords.' };
    }
    if (newPassword.trim().length < 8) {
      return { ok: false, error: 'Temporary staff password must be at least 8 characters.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client || !this.hasLiveSession()) {
      return { ok: false, error: 'Live Admin session required.' };
    }

    const { error } = await client.rpc('admin_set_staff_password', {
      p_staff_id: staffId,
      p_new_password: newPassword.trim(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    this.issuedStaffPasswordsSignal.update((map) => ({
      ...map,
      [staffId]: newPassword.trim(),
    }));
    return { ok: true };
  }

  async updateAccountPermissions(
    accountId: string,
    permissions: string[],
    staffTitle?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Admin role required.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const patch: Record<string, unknown> = { permissions };
    if (staffTitle !== undefined) {
      patch['staff_title'] = staffTitle;
    }

    const { error } = await client.from('profiles').update(patch).eq('id', accountId);
    if (error) {
      return { ok: false, error: error.message };
    }

    this.managedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === accountId
          ? { ...acc, permissions, staffTitle: staffTitle ?? acc.staffTitle }
          : acc,
      ),
    );
    return { ok: true };
  }

  async updateAccountProfile(
    accountId: string,
    patch: { organization?: string; hub?: string; businessRegNumber?: string | null },
  ): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Admin role required.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const dbPatch: Record<string, unknown> = {};
    if (patch.organization !== undefined) dbPatch['organization'] = patch.organization.trim();
    if (patch.hub !== undefined) dbPatch['hub_locode'] = patch.hub.trim();
    if (patch.businessRegNumber !== undefined) {
      dbPatch['business_reg_number'] = patch.businessRegNumber?.trim() || null;
    }

    const { error } = await client.from('profiles').update(dbPatch).eq('id', accountId);
    if (error) {
      return { ok: false, error: error.message };
    }

    this.managedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              organization: patch.organization !== undefined ? patch.organization.trim() : acc.organization,
              hub: patch.hub !== undefined ? patch.hub.trim() : acc.hub,
              businessRegNumber:
                patch.businessRegNumber !== undefined
                  ? (patch.businessRegNumber?.trim() || undefined)
                  : acc.businessRegNumber,
            }
          : acc,
      ),
    );
    return { ok: true };
  }

  async verifyDealer(accountId: string, decision: 'approved' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Admin role required.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const nextActive = decision === 'approved';
    const { error } = await client
      .from('profiles')
      .update({ approval_status: decision, active: nextActive })
      .eq('id', accountId);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.managedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === accountId ? { ...acc, approvalStatus: decision, active: nextActive } : acc,
      ),
    );
    return { ok: true };
  }

  async toggleAccountStatus(accountId: string): Promise<{ ok: boolean; error?: string }> {
    if (this.currentRole() !== 'admin') {
      return { ok: false, error: 'Admin role required.' };
    }

    const target = this.managedAccounts().find((acc) => acc.id === accountId);
    if (!target) {
      return { ok: false, error: 'Account not found.' };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const nextActive = !target.active;
    const { error } = await client
      .from('profiles')
      .update({ active: nextActive })
      .eq('id', accountId);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.managedAccounts.update((accounts) =>
      accounts.map((acc) => (acc.id === accountId ? { ...acc, active: nextActive } : acc)),
    );
    return { ok: true };
  }

  async resetPasswordAsync(email: string): Promise<string> {
    const cleanEmail = email.trim();
    const client = await this.supabase.ensureClient();
    if (!client) {
      return 'Supabase backend is not configured.';
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return 'Enter your registered work email above first.';
    }
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail);
    return error
      ? `Reset failed: ${error.message}`
      : `Password reset link sent to ${cleanEmail}.`;
  }

  async updateOwnProfile(patch: {
    name?: string;
    organization?: string;
    hub?: string;
    phone?: string;
    notificationPrefs?: NotificationPreferences;
  }): Promise<{ ok: boolean; error?: string }> {
    const current = this.userSignal();
    if (!current) {
      return { ok: false, error: 'You must be signed in to update your profile.' };
    }
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const basePatch: Record<string, unknown> = {};
    if (patch.name !== undefined && patch.name.trim()) basePatch['full_name'] = patch.name.trim();
    if (patch.organization !== undefined && patch.organization.trim()) {
      basePatch['organization'] = patch.organization.trim();
    }
    if (patch.hub !== undefined && patch.hub.trim()) basePatch['hub_locode'] = patch.hub.trim();

    const extendedPatch: Record<string, unknown> = { ...basePatch };
    if (patch.phone !== undefined) extendedPatch['phone'] = patch.phone.trim() || null;
    if (patch.notificationPrefs !== undefined) {
      extendedPatch['notification_prefs'] = patch.notificationPrefs;
    }

    let { error } = await client.from('profiles').update(extendedPatch).eq('id', current.id);
    if (error && Object.keys(basePatch).length > 0 && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('profiles').update(basePatch).eq('id', current.id);
      error = retry.error;
    }

    if (error && !/column|schema cache/i.test(error.message)) {
      return { ok: false, error: error.message };
    }

    const nextName = patch.name?.trim() || current.name;
    const updatedUser: AuthUser = {
      ...current,
      name: nextName,
      initials: this.extractInitials(nextName),
      organization: patch.organization?.trim() || current.organization,
      hub: patch.hub?.trim() || current.hub,
      phone: patch.phone !== undefined ? patch.phone.trim() : current.phone,
      notificationPrefs: patch.notificationPrefs ?? current.notificationPrefs ?? { ...DEFAULT_NOTIFICATION_PREFS },
    };
    this.setSession(updatedUser);
    return { ok: true };
  }

  async updateDealerProfile(patch: {
    name?: string;
    organization?: string;
    hub?: string;
    phone?: string;
    businessRegNumber?: string;
    businessAddress?: string;
    taxId?: string;
    verificationDocName?: string;
    verificationDocUrl?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const current = this.userSignal();
    const client = await this.supabase.ensureClient();
    if (!current || !client) {
      return { ok: false, error: 'Authenticated Supabase session required.' };
    }

    const basePatch: Record<string, unknown> = {};
    if (patch.name !== undefined && patch.name.trim()) basePatch['full_name'] = patch.name.trim();
    if (patch.organization !== undefined && patch.organization.trim()) {
      basePatch['organization'] = patch.organization.trim();
    }
    if (patch.hub !== undefined && patch.hub.trim()) basePatch['hub_locode'] = patch.hub.trim();
    if (patch.businessRegNumber !== undefined) {
      basePatch['business_reg_number'] = patch.businessRegNumber.trim() || null;
    }

    const extendedPatch: Record<string, unknown> = { ...basePatch };
    if (patch.phone !== undefined) extendedPatch['phone'] = patch.phone.trim();
    if (patch.businessAddress !== undefined) {
      extendedPatch['business_address'] = patch.businessAddress.trim();
    }
    if (patch.taxId !== undefined) extendedPatch['tax_id'] = patch.taxId.trim();
    const submittedAt = patch.verificationDocName ? new Date().toISOString() : undefined;
    if (patch.verificationDocName !== undefined) {
      extendedPatch['verification_doc_name'] = patch.verificationDocName.trim() || null;
      extendedPatch['verification_doc_url'] = patch.verificationDocUrl?.trim() || null;
      extendedPatch['verification_submitted_at'] = submittedAt ?? null;
    }

    let { error } = await client.from('profiles').update(extendedPatch).eq('id', current.id);
    if (error && Object.keys(basePatch).length > 0 && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('profiles').update(basePatch).eq('id', current.id);
      error = retry.error;
    }

    if (error && !/column|schema cache/i.test(error.message)) {
      return { ok: false, error: error.message };
    }

    const nextName = patch.name?.trim() || current.name;
    const updatedUser: AuthUser = {
      ...current,
      name: nextName,
      initials: this.extractInitials(nextName),
      organization: patch.organization?.trim() || current.organization,
      hub: patch.hub?.trim() || current.hub,
      phone: patch.phone !== undefined ? patch.phone.trim() : current.phone,
      businessRegNumber:
        patch.businessRegNumber !== undefined
          ? patch.businessRegNumber.trim() || undefined
          : current.businessRegNumber,
      businessAddress:
        patch.businessAddress !== undefined ? patch.businessAddress.trim() : current.businessAddress,
      taxId: patch.taxId !== undefined ? patch.taxId.trim() : current.taxId,
      verificationDocName:
        patch.verificationDocName !== undefined
          ? patch.verificationDocName.trim() || undefined
          : current.verificationDocName,
      verificationDocUrl:
        patch.verificationDocUrl !== undefined
          ? patch.verificationDocUrl.trim() || undefined
          : current.verificationDocUrl,
      verificationSubmittedAt: submittedAt ?? current.verificationSubmittedAt,
    };
    this.setSession(updatedUser);
    return { ok: true };
  }

  async changeOwnPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
    if (newPassword.trim().length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' };
    }
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }
    const { error } = await client.auth.updateUser({ password: newPassword.trim() });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async logout(): Promise<void> {
    const client = await this.supabase.ensureClient();
    if (client) {
      await client.auth.signOut();
    }
    this.liveSessionSignal.set(false);
    this.managedAccounts.set([]);
    this.issuedStaffPasswordsSignal.set({});
    this.clearSession();
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
        } else {
          this.liveSessionSignal.set(false);
          this.clearSession();
        }
      });

      client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          void this.loadProfileFromSupabase(session.user.id, session.user.email ?? '');
        } else {
          this.liveSessionSignal.set(false);
          this.managedAccounts.set([]);
          this.clearSession();
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
      return { allowed: false, reason: 'Supabase client unavailable.' };
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return {
        allowed: false,
        reason: error?.message ?? 'User profile not found in database.',
      };
    }

    if (data.approval_status === 'pending') {
      return {
        allowed: false,
        reason: 'Your Dealer business registration is pending Admin verification.',
      };
    }

    if (!data.active || data.approval_status === 'rejected') {
      return {
        allowed: false,
        reason: 'Your account is suspended or not approved for access.',
      };
    }

    const role = data.role as UserRole;
    const name = data.full_name || this.formatNameFromEmail(fallbackEmail);
    const user: AuthUser = {
      id: data.id,
      name,
      email: data.email ?? fallbackEmail,
      role,
      organization: data.organization,
      hub: data.hub_locode,
      initials: this.extractInitials(name),
      phone: typeof data.phone === 'string' ? data.phone : undefined,
      approvalStatus: (data.approval_status as ApprovalStatus) ?? 'approved',
      businessRegNumber:
        typeof data.business_reg_number === 'string' ? data.business_reg_number : undefined,
      businessAddress:
        typeof data.business_address === 'string' ? data.business_address : undefined,
      taxId: typeof data.tax_id === 'string' ? data.tax_id : undefined,
      verificationDocName:
        typeof data.verification_doc_name === 'string' ? data.verification_doc_name : undefined,
      verificationDocUrl:
        typeof data.verification_doc_url === 'string' ? data.verification_doc_url : undefined,
      verificationSubmittedAt:
        typeof data.verification_submitted_at === 'string'
          ? data.verification_submitted_at
          : undefined,
      permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
      notificationPrefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...(typeof data.notification_prefs === 'object' && data.notification_prefs
          ? (data.notification_prefs as Partial<NotificationPreferences>)
          : {}),
      },
    };
    this.liveSessionSignal.set(true);
    this.setSession(user);

    const loginAt = new Date().toISOString();
    await client
      .from('profiles')
      .update({ last_login_at: loginAt })
      .eq('id', userId);

    void client.from('telemetry_logs').insert({
      channel: 'AUTH',
      severity: 'info',
      endpoint: '/auth/v1/token',
      latency_ms: 38,
      message: `${user.email} (${role}) authenticated via Supabase Auth`,
      actor_id: userId,
    });

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
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesList) {
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
          staffTitle: row.staff_title ?? undefined,
          permissions: Array.isArray(row.permissions) ? row.permissions : [],
          lastLoginAt: row.last_login_at ?? undefined,
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

  private clearSession(): void {
    this.userSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(STORAGE_KEY);
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
