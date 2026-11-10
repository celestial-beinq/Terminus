import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly clientSignal = signal<SupabaseClient | null>(null);
  private initPromise: Promise<SupabaseClient | null> | null = null;

  readonly client = this.clientSignal.asReadonly();
  readonly isConfigured = computed(
    () =>
      Boolean(environment.supabaseUrl?.trim()) &&
      Boolean(environment.supabaseAnonKey?.trim()) &&
      !environment.supabaseUrl.includes('YOUR_PROJECT'),
  );
  readonly isLiveConnected = computed(() => this.clientSignal() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId) && this.isConfigured()) {
      void this.ensureClient();
    }
  }

  async ensureClient(): Promise<SupabaseClient | null> {
    if (this.clientSignal()) {
      return this.clientSignal();
    }
    if (!isPlatformBrowser(this.platformId) || !this.isConfigured()) {
      return null;
    }
    if (!this.initPromise) {
      this.initPromise = import('@supabase/supabase-js').then(({ createClient }) => {
        const instance = createClient(
          environment.supabaseUrl.trim(),
          environment.supabaseAnonKey.trim(),
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          },
        );
        this.clientSignal.set(instance);
        return instance;
      });
    }
    return this.initPromise;
  }
}
