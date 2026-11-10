import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { HomePage } from './pages/home/home';
import { TrackingPage } from './pages/tracking/tracking';
import { LoginPage } from './pages/login/login';
import { DashboardPage } from './pages/dashboard/dashboard';
import { ContactPage } from './pages/contact/contact';
import { FreightCalculator } from './components/freight-calculator/freight-calculator';
import { FaqSection } from './components/faq-section/faq-section';
import { CargoDataService } from './services/cargo-data.service';
import { AuthService } from './services/auth.service';
import { SupabaseService } from './services/supabase.service';

function createInMemorySupabaseMock() {
  const db: Record<string, any[]> = {
    port_hubs: [
      { code: 'CNSHA', name: 'Shanghai Yangshan', country: 'China', corridor: 'Asia → Europe', berth_status: 'Optimal', avg_dwell_hours: 14, weekly_sailings: 28 },
      { code: 'NLRTM', name: 'Rotterdam Maasvlakte II', country: 'Netherlands', corridor: 'Asia → Europe', berth_status: 'Optimal', avg_dwell_hours: 16, weekly_sailings: 24 },
      { code: 'SGSIN', name: 'Singapore Tuas', country: 'Singapore', corridor: 'Intra-Asia', berth_status: 'Optimal', avg_dwell_hours: 11, weekly_sailings: 34 },
    ],
    profiles: [
      { id: 'admin-uuid-1', email: 'admin@terminus.io', full_name: 'Marcus Vance', role: 'admin', organization: 'Terminus HQ', hub_locode: 'NLRTM', active: true, approval_status: 'approved' },
    ],
    shipments: [
      {
        id: 'ship-1',
        tracking_id: 'TRM-884210',
        container_number: 'TRMU 492018-4',
        seal_number: 'SL-904182',
        vessel_name: 'MV Terminus Horizon',
        vessel_imo: 'IMO 9841205',
        voyage_number: 'V.264W',
        origin_label: 'Port of Shanghai (CNSHA)',
        destination_label: 'Port of Rotterdam (NLRTM)',
        incoterm: 'CIF',
        vgm_kg: 24800,
        eta: 'Nov 14, 2026',
        last_free_day: 'Nov 19, 2026',
        status: 'In Transit',
        cargo_type: '40ft High-Cube',
        teu: '2 TEU',
        progress_percent: 74,
        customer_id: 'cust-1',
        dealer_id: null,
        shipment_milestones: [
          { timestamp_label: 'Oct 22', location: 'Shanghai', event_description: 'Gate-in', completed: true, sort_order: 1 },
        ],
      },
    ],
    shipment_milestones: [],
    quote_requests: [],
    invoices: [],
    gate_tasks: [],
    activity_events: [],
    telemetry_logs: [],
    system_settings: [
      {
        key: 'platform_config',
        value: {
          autoCustomsPreclearance: true,
          demurrageAlertHours: 24,
          aisPollingMinutes: 15,
          webhookNotifications: true,
          requireDealerDocs: true,
          strictMfaForAdmins: false,
        },
      },
    ],
  };

  let currentSession: { user: { id: string; email: string } } | null = null;
  const authListeners: Array<(event: string, session: any) => void> = [];

  const emitAuth = (event: string, session: any) => {
    currentSession = session;
    for (const cb of authListeners) {
      cb(event, session);
    }
  };

  const makeBuilder = (table: string) => {
    let filters: Array<(r: any) => boolean> = [];
    let pendingInsert: any = null;
    let pendingUpdate: any = null;

    const executeSelect = () => {
      const rows = (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
      return { data: rows, error: null };
    };

    const builder: any = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      maybeSingle: async () => {
        const rows = (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] ?? null, error: null };
      },
      single: async () => {
        if (pendingInsert) {
          const items = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
          const inserted = items.map((item, i) => ({ id: `${table}-${Date.now()}-${i}`, ...item }));
          db[table].unshift(...inserted);
          return { data: inserted[0], error: null };
        }
        const rows = (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] ?? null, error: null };
      },
      insert: (payload: any) => {
        pendingInsert = payload;
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = items.map((item, i) => ({
          id: `${table}-${Date.now()}-${i}`,
          created_at: new Date().toISOString(),
          ...item,
        }));
        const execPromise = Promise.resolve().then(() => {
          db[table].unshift(...inserted);
          return { data: inserted, error: null };
        });
        return {
          select: () => ({
            single: async () => {
              const res = await execPromise;
              return { data: res.data[0], error: null };
            },
          }),
          then: execPromise.then.bind(execPromise),
        };
      },
      upsert: (payload: any) => {
        const items = Array.isArray(payload) ? payload : [payload];
        for (const item of items) {
          const idx = (db[table] ?? []).findIndex((r) => (item.key ? r.key === item.key : r.id === item.id));
          if (idx >= 0) {
            db[table][idx] = { ...db[table][idx], ...item };
          } else {
            db[table].unshift(item);
          }
        }
        return Promise.resolve({ data: items, error: null });
      },
      update: (patch: any) => {
        pendingUpdate = patch;
        return {
          eq: (col: string, val: any) => {
            const chain: any = {
              eq: (col2: string, val2: any) => {
                db[table] = (db[table] ?? []).map((r) =>
                  r[col] === val && r[col2] === val2 ? { ...r, ...pendingUpdate } : r,
                );
                return Promise.resolve({ data: null, error: null });
              },
              then: (resolve: any) => {
                db[table] = (db[table] ?? []).map((r) =>
                  r[col] === val ? { ...r, ...pendingUpdate } : r,
                );
                return Promise.resolve({ data: null, error: null }).then(resolve);
              },
            };
            return chain;
          },
        };
      },
      then: (resolve: any) => Promise.resolve(executeSelect()).then(resolve),
    };
    return builder;
  };

  const client: any = {
    from: (table: string) => makeBuilder(table),
    rpc: async (fn: string, args: any) => {
      if (fn === 'lookup_shipment_by_tracking') {
        const q = String(args.p_query ?? '').trim().toUpperCase();
        const found = db['shipments'].find(
          (s) => s.tracking_id.toUpperCase() === q || s.container_number.toUpperCase().includes(q),
        );
        if (!found) return { data: null, error: null };
        return {
          data: {
            trackingId: found.tracking_id,
            containerNumber: found.container_number,
            vessel: `${found.vessel_name} (${found.vessel_imo})`,
            origin: found.origin_label,
            destination: found.destination_label,
            eta: found.eta,
            status: found.status,
            cargoType: found.cargo_type,
            teu: found.teu,
            progressPercent: found.progress_percent,
            milestones: [],
          },
          error: null,
        };
      }
      if (fn === 'admin_create_staff') {
        const newStaff = {
          id: `staff-${Date.now()}`,
          email: args.p_email,
          full_name: args.p_full_name,
          role: 'staff',
          organization: args.p_organization,
          hub_locode: args.p_hub_locode,
          active: true,
          approval_status: 'approved',
        };
        db['profiles'].unshift(newStaff);
        return { data: newStaff, error: null };
      }
      return { data: null, error: null };
    },
    channel: () => {
      const ch: any = {
        on: () => ch,
        subscribe: (cb?: (status: string) => void) => {
          cb?.('SUBSCRIBED');
          return ch;
        },
      };
      return ch;
    },
    auth: {
      getSession: async () => ({ data: { session: currentSession }, error: null }),
      onAuthStateChange: (cb: any) => {
        authListeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signUp: async ({ email, options }: any) => {
        const meta = options?.data ?? {};
        const role = meta.role === 'dealer' ? 'dealer' : 'customer';
        const userId = `usr-${Date.now()}`;
        const profile = {
          id: userId,
          email,
          full_name: meta.full_name ?? 'User',
          role,
          organization: meta.organization ?? 'Shipper',
          hub_locode: 'NLRTM',
          active: role === 'customer',
          approval_status: role === 'dealer' ? 'pending' : 'approved',
          business_reg_number: meta.business_reg_number ?? null,
        };
        db['profiles'].unshift(profile);
        const session = role === 'customer' ? { user: { id: userId, email } } : null;
        if (session) emitAuth('SIGNED_IN', session);
        return { data: { user: { id: userId, email }, session }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        const profile = db['profiles'].find((p) => p.email.toLowerCase() === email.toLowerCase());
        if (!profile) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        const session = { user: { id: profile.id, email: profile.email } };
        emitAuth('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      },
      signOut: async () => {
        emitAuth('SIGNED_OUT', null);
        return { error: null };
      },
      resetPasswordForEmail: async () => ({ error: null }),
    },
  };

  return {
    client: signal<any>(client).asReadonly(),
    isConfigured: signal(true).asReadonly(),
    isLiveConnected: signal(true).asReadonly(),
    ensureClient: async () => client,
  };
}

describe('Terminus Cargo Platform', () => {
  let mockSupabase: ReturnType<typeof createInMemorySupabaseMock>;

  beforeEach(async () => {
    sessionStorage.clear();
    mockSupabase = createInMemorySupabaseMock();

    await TestBed.configureTestingModule({
      imports: [
        App,
        HomePage,
        TrackingPage,
        LoginPage,
        DashboardPage,
        ContactPage,
        FreightCalculator,
        FaqSection,
      ],
      providers: [
        provideRouter(routes),
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compileComponents();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render hero headline, AOS markers, and muted videos on HomePage', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';

    expect(compiled.querySelector('h1')?.textContent).toContain('Building digital');
    expect(text).toContain('About Us');
    expect(text).toContain('Live Monitoring');
    expect(text).toContain('How Terminus Works');
    expect(text).toContain('Countries We Have Worked With');
    expect(text).toContain('Client Testimonials');
    expect(text).toContain('Frequently Asked Questions');
    expect(text).toContain('Get Started Today');

    expect(compiled.querySelectorAll('[data-aos]').length).toBeGreaterThan(25);

    const videos = Array.from(compiled.querySelectorAll('video'));
    expect(videos.length).toBe(2);
    for (const video of videos) {
      expect(video.muted).toBe(true);
      expect(video.defaultMuted).toBe(true);
      expect(video.volume).toBe(0);
    }
  });

  it('should hydrate live ports/shipments from Supabase and calculate freight quotes', async () => {
    const service = TestBed.inject(CargoDataService);
    await service.refreshAllFromSupabase();

    expect(service.livePorts().length).toBe(3);
    const quote = service.calculateFreightQuote('CNSHA', 'NLRTM', '40-hc', 2);
    expect(quote).not.toBeNull();
    expect(quote?.transitDays).toBe(24);

    const lookedUp = await service.lookupShipmentRemote('TRM-884210');
    expect(lookedUp?.containerNumber).toBe('TRMU 492018-4');
  });

  it('should swap ports in FreightCalculator and store quote draft', async () => {
    const service = TestBed.inject(CargoDataService);
    await service.refreshAllFromSupabase();

    const fixture = TestBed.createComponent(FreightCalculator);
    await fixture.whenStable();

    const swapBtn = fixture.nativeElement.querySelector('.swap-btn') as HTMLButtonElement;
    swapBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.summary-route')?.textContent).toContain('NLRTM → CNSHA');
    (fixture.nativeElement.querySelector('.book-btn') as HTMLButtonElement).click();
    expect(service.quoteDraft()?.lane).toContain('Rotterdam');
  });

  it('should enforce live role governance: customer self-signup, dealer pending admin approval, and admin-only staff creation', async () => {
    const auth = TestBed.inject(AuthService);
    const cargo = TestBed.inject(CargoDataService);
    await cargo.refreshAllFromSupabase();

    // 1. Login page has zero offline demo cards
    const loginFixture = TestBed.createComponent(LoginPage);
    await loginFixture.whenStable();
    expect(loginFixture.nativeElement.querySelectorAll('.demo-card').length).toBe(0);

    // 2. Dealer registers -> pending Admin verification, cannot sign in yet
    const dealerSignup = await auth.signUpAsync(
      'broker@eurogate.de',
      'secure123',
      'Lukas Weber',
      'Eurogate Brokers',
      'dealer',
      'DE-HBG-44210',
    );
    expect(dealerSignup.ok).toBe(true);
    expect(dealerSignup.pendingApproval).toBe(true);

    const blockedDealer = await auth.signInAsync('broker@eurogate.de', 'secure123');
    expect(blockedDealer.ok).toBe(false);

    // 3. Customer self-registers -> immediate access, cannot create staff
    const custSignup = await auth.signUpAsync(
      'elena@lumen.com',
      'secure123',
      'Elena Rostova',
      'Lumen Logistics',
      'customer',
    );
    expect(custSignup.ok).toBe(true);
    expect(auth.currentRole()).toBe('customer');

    const deniedStaff = await auth.createStaffByAdmin({
      fullName: 'Bad Actor',
      email: 'bad@terminus.io',
      password: 'password123',
      organization: 'Terminus',
      hubLocode: 'NLRTM',
    });
    expect(deniedStaff.ok).toBe(false);

    // 4. Backend-provisioned Admin signs in -> approves Dealer -> creates Staff
    const adminLogin = await auth.signInAsync('admin@terminus.io', 'TerminusAdmin2026!');
    expect(adminLogin.ok).toBe(true);
    expect(auth.currentRole()).toBe('admin');

    const pendingDealer = auth.managedAccounts().find((a) => a.email === 'broker@eurogate.de');
    expect(pendingDealer?.approvalStatus).toBe('pending');
    await auth.verifyDealer(pendingDealer!.id, 'approved');

    const createdStaff = await auth.createStaffByAdmin({
      fullName: 'Jordan Patel',
      email: 'jordan@terminus.io',
      password: 'password123',
      organization: 'Terminus Port Ops',
      hubLocode: 'NLRTM',
    });
    expect(createdStaff.ok).toBe(true);

    // 5. Booking & Invoice persistence
    const bookingRes = await cargo.addShipment('Shanghai (CNSHA)', 'Rotterdam (NLRTM)', '40ft HC', 'CIF');
    expect(bookingRes.ok).toBe(true);

    const invRes = await cargo.issueInvoice(bookingRes.shipment!, 4800);
    expect(invRes.ok).toBe(true);
    expect(invRes.invoice?.amountUsd).toBe(4800);

    // 6. Approved Dealer can now sign in
    const dealerLogin = await auth.signInAsync('broker@eurogate.de', 'secure123');
    expect(dealerLogin.ok).toBe(true);
    expect(auth.currentRole()).toBe('dealer');
  });

  it('should pre-fill ContactPage from quoteDraft and toggle FAQ items', async () => {
    const cargo = TestBed.inject(CargoDataService);
    cargo.setQuoteDraft({
      mode: 'Active Reefer (-18°C)',
      lane: 'Hamburg (DEHAM) → Savannah (USSAV)',
      notes: '2 × 40ft Active Reefer',
    });

    const contactFixture = TestBed.createComponent(ContactPage);
    await contactFixture.whenStable();
    expect((contactFixture.nativeElement.querySelector('#lane-input') as HTMLInputElement).value).toContain('Hamburg');

    const faqFixture = TestBed.createComponent(FaqSection);
    await faqFixture.whenStable();
    const triggers = faqFixture.nativeElement.querySelectorAll('.faq-trigger');
    (triggers[1] as HTMLButtonElement).click();
    faqFixture.detectChanges();
    expect(faqFixture.nativeElement.querySelector('.faq-answer')?.textContent).toContain('FCL');
  });
});
