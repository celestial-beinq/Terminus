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
import { AdminConsole, AdminModuleTab } from './components/admin-console/admin-console';
import { CustomerConsole, CustomerModuleTab } from './components/customer-console/customer-console';
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
    shipment_requests: [],
    customer_notifications: [],
    support_tickets: [],
    support_messages: [],
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
          dealerMinMarginPercent: 4.5,
          dealerMaxMarginPercent: 20,
        },
      },
    ],
  };

  let nextId = 1;
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
          const inserted = items.map((item) => ({ id: `${table}-${++nextId}`, ...item }));
          db[table].unshift(...inserted);
          return { data: inserted[0], error: null };
        }
        const rows = (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] ?? null, error: null };
      },
      insert: (payload: any) => {
        pendingInsert = payload;
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = items.map((item) => ({
          id: `${table}-${++nextId}`,
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
          id: `staff-${++nextId}`,
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
      if (fn === 'admin_set_staff_password') {
        const target = db['profiles'].find((p) => p.id === args.p_staff_id && p.role === 'staff');
        if (!target) return { data: null, error: { message: 'Staff account not found.' } };
        return { data: { ok: true }, error: null };
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
        const userId = `usr-${++nextId}`;
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
      updateUser: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://mock/${path}` }, error: null }),
      }),
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

  it('should render all Admin modules A-I and support live staff permissions, shipment dispatch, gate tasks, CSV export & system settings', async () => {
    const auth = TestBed.inject(AuthService);
    const cargo = TestBed.inject(CargoDataService);

    const adminLogin = await auth.signInAsync('admin@terminus.io', 'TerminusAdmin2026!');
    expect(adminLogin.ok).toBe(true);
    await cargo.refreshAllFromSupabase();

    const dashFixture = TestBed.createComponent(DashboardPage);
    dashFixture.detectChanges();
    await dashFixture.whenStable();

    const adminEl: HTMLElement = dashFixture.nativeElement;
    expect(adminEl.querySelector('app-admin-console')).toBeTruthy();

    const adminFixture = TestBed.createComponent(AdminConsole);
    const adminComp = adminFixture.componentInstance;
    adminFixture.detectChanges();
    await adminFixture.whenStable();

    // Check all 9 Admin module tabs (A-I) render cleanly
    const navTabs: AdminModuleTab[] = [
      'overview',
      'users',
      'dealers',
      'shipments',
      'financials',
      'customs',
      'telemetry',
      'reports',
      'settings',
    ];
    expect(adminFixture.nativeElement.querySelectorAll('.admin-nav-btn').length).toBe(9);
    for (const tab of navTabs) {
      adminComp.activeModule.set(tab);
      adminFixture.detectChanges();
      await adminFixture.whenStable();
      expect(adminFixture.nativeElement.querySelector('.admin-console-wrap')).toBeTruthy();
    }

    // B: Create staff + update permissions & title
    const staffRes = await auth.createStaffByAdmin({
      fullName: 'Nadia Kouri',
      email: 'nadia@terminus.io',
      password: 'password123',
      organization: 'Terminus Customs',
      hubLocode: 'NLRTM',
    });
    expect(staffRes.ok).toBe(true);
    const createdStaffAcc = auth.managedAccounts().find((a) => a.email === 'nadia@terminus.io');
    expect(createdStaffAcc).toBeTruthy();

    const permRes = await auth.updateAccountPermissions(
      createdStaffAcc!.id,
      ['shipments', 'customs'],
      'Senior Customs Officer',
    );
    expect(permRes.ok).toBe(true);
    const updatedStaff = auth.managedAccounts().find((a) => a.id === createdStaffAcc!.id);
    expect(updatedStaff?.staffTitle).toBe('Senior Customs Officer');
    expect(updatedStaff?.permissions).toEqual(['shipments', 'customs']);

    // D & F: Assign staff, flag delay/dispute, update customs status & add gate task
    const createdShip = await cargo.addShipment(
      'Port of Shanghai (CNSHA)',
      'Port of Rotterdam (NLRTM)',
      '40ft Reefer',
      'CIF',
      { assignedStaffId: createdStaffAcc!.id, freightChargeUsd: 5200 },
    );
    expect(createdShip.ok).toBe(true);
    const tid = createdShip.shipment!.trackingId;

    const shipPatch = await cargo.updateShipmentAdmin(tid, {
      customsStatus: 'Hold / Inspection',
      isDelayed: true,
      disputeNote: 'Awaiting phytosanitary certificate',
    });
    expect(shipPatch.ok).toBe(true);
    const patchedShip = cargo.findShipment(tid);
    expect(patchedShip?.customsStatus).toBe('Hold / Inspection');
    expect(patchedShip?.isDelayed).toBe(true);
    expect(patchedShip?.assignedStaffId).toBe(createdStaffAcc!.id);

    const gateRes = await cargo.addGateTask({
      containerNumber: createdShip.shipment!.containerNumber,
      terminalName: 'Rotterdam Maasvlakte II',
      vesselName: 'MV Terminus Meridian',
      actionRequired: 'Customs X-Ray Inspection',
    });
    expect(gateRes.ok).toBe(true);
    expect(cargo.gateTasks().length).toBeGreaterThan(0);

    // G & H: Telemetry heartbeat & CSV export
    await cargo.logTelemetry('API', 'info', '/realtime/v1/heartbeat', 35, 'Suite check OK');
    expect(cargo.telemetryLogs()[0]?.endpoint).toBe('/realtime/v1/heartbeat');
    const csv = adminComp.buildCsvReport('shipments');
    expect(csv).toContain(tid);

    // I: System Settings persistence
    const cfgRes = await cargo.saveSystemConfig({
      autoCustomsPreclearance: false,
      demurrageAlertHours: 48,
      aisPollingMinutes: 10,
      webhookNotifications: true,
      requireDealerDocs: true,
      strictMfaForAdmins: true,
      dealerMinMarginPercent: 4.5,
      dealerMaxMarginPercent: 20,
    });
    expect(cfgRes.ok).toBe(true);
    expect(cargo.systemConfig().demurrageAlertHours).toBe(48);
    expect(cargo.systemConfig().strictMfaForAdmins).toBe(true);

    // Notification well + Vessel/ETA update + Dealer profile verification
    const vesselPatch = await cargo.updateShipmentAdmin(tid, {
      vessel: 'MV Terminus Vanguard',
      voyage: 'V.301E',
      eta: 'Dec 08, 2026',
    });
    expect(vesselPatch.ok).toBe(true);
    expect(cargo.findShipment(tid)?.eta).toBe('Dec 08, 2026');

    adminComp.toastMessage.set(`Created & assigned shipment ${tid}.`);
    adminFixture.detectChanges();
    const toastEl = adminFixture.nativeElement.querySelector('.dash-toast');
    expect(toastEl?.textContent).toContain(tid);
    const dismissBtn = adminFixture.nativeElement.querySelector('.dash-toast-dismiss') as HTMLButtonElement;
    expect(dismissBtn).toBeTruthy();
    dismissBtn.click();
    adminFixture.detectChanges();
    expect(adminFixture.nativeElement.querySelector('.dash-toast')).toBeNull();

    // Verify lastLoginAt persisted before directory fetch & accurate role subtitles
    const signedAdmin = auth.managedAccounts().find((a) => a.email === 'admin@terminus.io');
    expect(signedAdmin?.lastLoginAt).toBeTruthy();
    expect(adminComp.displayRoleSubtitle(signedAdmin!)).toBe('Super Admin');

    // Verify Admin can view session-issued staff onboarding password & re-issue a temp password
    expect(auth.issuedStaffPasswords()[createdStaffAcc!.id]).toBe('password123');
    const reissueRes = await auth.setStaffPasswordByAdmin(createdStaffAcc!.id, 'StaffTemp2026!');
    expect(reissueRes.ok).toBe(true);
    expect(auth.issuedStaffPasswords()[createdStaffAcc!.id]).toBe('StaffTemp2026!');

    // Verify Dealer quote creation with custom rate & margin
    const dealerSignup = await auth.signUpAsync(
      'partner@nordicfreight.eu',
      'secure123',
      'Sven Lindqvist',
      'Nordic Freight',
      'dealer',
      'SE-GOTH-992',
    );
    expect(dealerSignup.ok).toBe(true);
    await auth.signInAsync('admin@terminus.io', 'TerminusAdmin2026!');
    const pendingPartner = auth.managedAccounts().find((a) => a.email === 'partner@nordicfreight.eu');
    await auth.verifyDealer(pendingPartner!.id, 'approved');
    await auth.signInAsync('partner@nordicfreight.eu', 'secure123');
    const quoteRes = await cargo.submitQuoteRequest({
      company: 'Nordic Pharma AB',
      email: 'ops@nordicpharma.se',
      mode: '40ft Active Reefer',
      lane: 'DEHAM → USSAV',
      notes: 'Temperature -18C validated',
      rateUsd: 6400,
      marginPercent: 11.5,
    });
    expect(quoteRes.ok).toBe(true);
    expect(cargo.dealerQuotes()[0]?.rateUsd).toBe(6400);
    expect(cargo.dealerQuotes()[0]?.marginPercent).toBe(11.5);
  });

  it('should render all Customer Dashboard modules A-H and support shipment requests, tracking, invoices/receipts, notifications, support & account settings', async () => {
    const auth = TestBed.inject(AuthService);
    const cargo = TestBed.inject(CargoDataService);

    const custSignup = await auth.signUpAsync(
      'shipper@apexglobal.com',
      'secure123',
      'Clara Vance',
      'Apex Global Imports',
      'customer',
    );
    expect(custSignup.ok).toBe(true);
    expect(auth.currentRole()).toBe('customer');
    await cargo.refreshAllFromSupabase();

    const dashFixture = TestBed.createComponent(DashboardPage);
    dashFixture.detectChanges();
    await dashFixture.whenStable();
    expect(dashFixture.nativeElement.querySelector('app-customer-console')).toBeTruthy();

    const custFixture = TestBed.createComponent(CustomerConsole);
    const custComp = custFixture.componentInstance;
    custFixture.detectChanges();
    await custFixture.whenStable();

    // Verify all 8 Customer modules A-H render cleanly
    const tabs: CustomerModuleTab[] = [
      'overview',
      'requests',
      'tracking',
      'history',
      'invoices',
      'notifications',
      'support',
      'settings',
    ];
    expect(custFixture.nativeElement.querySelectorAll('.admin-nav-btn').length).toBe(8);
    for (const tab of tabs) {
      custComp.activeModule.set(tab);
      custFixture.detectChanges();
      await custFixture.whenStable();
      expect(custFixture.nativeElement.querySelector('.customer-console-wrap')).toBeTruthy();
    }

    // B & E: Customer CANNOT submit shipment request before paying & getting Admin/Staff verification
    const sampleFile = new File(['invoice-content'], 'commercial-invoice.pdf', { type: 'application/pdf' });
    const blockedReq = await cargo.submitCustomerShipmentRequest({
      cargoType: '40ft High-Cube Dry',
      cargoDescription: 'Precision CNC turbines on 12 pallets',
      origin: 'Port of Shanghai Yangshan (CNSHA)',
      destination: 'Port of Rotterdam Maasvlakte II (NLRTM)',
      weightKg: 19400,
      dimensionsCm: '1200 x 235 x 269 cm',
      shippingMethod: 'Ocean FCL',
      incoterm: 'CIF',
      files: [sampleFile],
      docCategory: 'Commercial Invoice & Packing List',
    });
    expect(blockedReq.ok).toBe(false);

    // Customer submits advance payment -> status stays Due, verificationStatus = pending_verification
    const advPayRes = await cargo.submitCustomerAdvancePayment({
      lane: 'CNSHA → NLRTM',
      amountUsd: 5150,
      paymentMethod: 'Corporate ACH / Wire',
      paymentReference: 'WIRE-2026-88412',
    });
    expect(advPayRes.ok).toBe(true);
    expect(advPayRes.invoice?.status).toBe('Due');
    expect(advPayRes.invoice?.verificationStatus).toBe('pending_verification');

    // Customer CANNOT self-verify or mark their own invoice Paid
    const selfVerify = await cargo.verifyInvoicePayment(advPayRes.invoice!.id, 'verified');
    expect(selfVerify.ok).toBe(false);
    const selfPay = await cargo.payInvoice(advPayRes.invoice!.id);
    expect(selfPay.ok).toBe(false);

    // Still blocked while payment is pending_verification
    const pendingReq = await cargo.submitCustomerShipmentRequest({
      cargoType: '40ft High-Cube Dry',
      cargoDescription: 'Precision CNC turbines on 12 pallets',
      origin: 'Port of Shanghai Yangshan (CNSHA)',
      destination: 'Port of Rotterdam Maasvlakte II (NLRTM)',
      weightKg: 19400,
      dimensionsCm: '1200 x 235 x 269 cm',
      shippingMethod: 'Ocean FCL',
      incoterm: 'CIF',
      verifiedInvoiceId: advPayRes.invoice!.id,
    });
    expect(pendingReq.ok).toBe(false);

    // Admin/Staff verifies the customer payment -> Paid + Verified + Receipt
    await auth.signInAsync('admin@terminus.io', 'TerminusAdmin2026!');
    await cargo.refreshAllFromSupabase();
    const verifyRes = await cargo.verifyInvoicePayment(advPayRes.invoice!.id, 'verified');
    expect(verifyRes.ok).toBe(true);
    expect(verifyRes.receiptNumber).toContain('RCP-');
    expect(cargo.invoices().find((i) => i.id === advPayRes.invoice!.id)?.status).toBe('Paid');
    expect(cargo.invoices().find((i) => i.id === advPayRes.invoice!.id)?.verificationStatus).toBe('verified');

    // Customer signs back in -> can now submit shipment request using verified payment
    await auth.signInAsync('shipper@apexglobal.com', 'secure123');
    await cargo.refreshAllFromSupabase();
    const reqRes = await cargo.submitCustomerShipmentRequest({
      cargoType: '40ft High-Cube Dry',
      cargoDescription: 'Precision CNC turbines on 12 pallets',
      origin: 'Port of Shanghai Yangshan (CNSHA)',
      destination: 'Port of Rotterdam Maasvlakte II (NLRTM)',
      weightKg: 19400,
      dimensionsCm: '1200 x 235 x 269 cm',
      shippingMethod: 'Ocean FCL',
      incoterm: 'CIF',
      verifiedInvoiceId: advPayRes.invoice!.id,
      files: [sampleFile],
      docCategory: 'Commercial Invoice & Packing List',
    });
    expect(reqRes.ok).toBe(true);
    expect(reqRes.shipment?.vgmKg).toBe(19400);
    expect(reqRes.shipment?.shippingDocs?.length).toBe(1);
    expect(cargo.shipmentRequests().length).toBe(1);
    expect(cargo.customerNotifications().length).toBeGreaterThan(0);

    // Same verified invoice cannot be reused for a second shipment request
    const reuseReq = await cargo.submitCustomerShipmentRequest({
      cargoType: '20ft Standard Dry',
      cargoDescription: 'Second attempt',
      origin: 'Port of Shanghai Yangshan (CNSHA)',
      destination: 'Port of Rotterdam Maasvlakte II (NLRTM)',
      weightKg: 8000,
      dimensionsCm: '600 x 235 x 239 cm',
      shippingMethod: 'Ocean FCL',
      incoterm: 'CIF',
      verifiedInvoiceId: advPayRes.invoice!.id,
    });
    expect(reuseReq.ok).toBe(false);

    // C: Remote tracking lookup
    const tracked = await cargo.lookupShipmentRemote(reqRes.shipment!.trackingId);
    expect(tracked?.trackingId).toBe(reqRes.shipment!.trackingId);

    // G: Support ticket, staff/customer thread reply & resolution
    const ticketRes = await cargo.submitSupportTicket({
      ticketType: 'enquiry',
      subject: 'Verify customs pre-clearance documents',
      priority: 'High',
      shipmentTrackingId: reqRes.shipment!.trackingId,
      message: 'Please confirm commercial invoice receipt for Rotterdam customs.',
    });
    expect(ticketRes.ok).toBe(true);
    const replyRes = await cargo.replyToSupportTicket(ticketRes.ticket!.id, 'Attaching updated packing list.');
    expect(replyRes.ok).toBe(true);
    expect(cargo.supportTickets()[0]?.messages.length).toBe(2);
    const resolveRes = await cargo.resolveSupportTicket(ticketRes.ticket!.id);
    expect(resolveRes.ok).toBe(true);
    expect(cargo.supportTickets()[0]?.status).toBe('Resolved');

    // H: Account settings (profile, phone, notification preferences, password)
    const profileRes = await auth.updateOwnProfile({
      name: 'Clara Vance-Mercer',
      phone: '+1 912 555 0144',
      notificationPrefs: {
        shipmentConfirmation: true,
        dispatchUpdates: true,
        portArrival: true,
        customsUpdates: true,
        deliveryNotifications: true,
        invoiceReminders: false,
      },
    });
    expect(profileRes.ok).toBe(true);
    expect(auth.currentUser()?.phone).toBe('+1 912 555 0144');
    expect(auth.currentUser()?.notificationPrefs?.invoiceReminders).toBe(false);

    const pwRes = await auth.changeOwnPassword('NewCustomerPass2026!');
    expect(pwRes.ok).toBe(true);
  });
});
