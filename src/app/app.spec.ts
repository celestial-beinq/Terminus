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

describe('Terminus Cargo Platform', () => {
  const mockSupabaseService = {
    client: signal(null).asReadonly(),
    isConfigured: signal(false).asReadonly(),
    isLiveConnected: signal(false).asReadonly(),
    ensureClient: async () => null,
  };

  beforeEach(async () => {
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
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compileComponents();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render hero headline and all requested home sections', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';

    expect(compiled.querySelector('h1')?.textContent).toContain('Building digital');
    expect(text).toContain('About Us');
    expect(text).toContain('Trusted By Enterprise Supply Chains');
    expect(text).toContain('Live Monitoring');
    expect(text).toContain('How Terminus Works');
    expect(text).toContain('Countries We Have Worked With');
    expect(text).toContain('Client Testimonials');
    expect(text).toContain('Frequently Asked Questions');
    expect(text).toContain('Get Started Today');

    const aosElements = compiled.querySelectorAll('[data-aos]');
    expect(aosElements.length).toBeGreaterThan(25);

    const videos = Array.from(compiled.querySelectorAll('video'));
    expect(videos.length).toBe(2);
    for (const video of videos) {
      expect(video.muted).toBe(true);
      expect(video.defaultMuted).toBe(true);
      expect(video.volume).toBe(0);

      video.muted = false;
      video.volume = 1;
      video.dispatchEvent(new Event('volumechange'));
      expect(video.muted).toBe(true);
      expect(video.volume).toBe(0);
    }
  });

  it('should calculate ocean freight quotes and look up shipments', () => {
    const service = TestBed.inject(CargoDataService);
    const quote = service.calculateFreightQuote('CNSHA', 'NLRTM', '40-hc', 2);
    expect(quote).not.toBeNull();
    expect(quote?.transitDays).toBe(24);
    expect(quote?.totalUsd).toBeGreaterThan(0);

    const samePort = service.calculateFreightQuote('CNSHA', 'CNSHA', '20-dry', 1);
    expect(samePort).toBeNull();

    const shipment = service.findShipment('trm-884210');
    expect(shipment?.containerNumber).toBe('TRMU 492018-4');

    const thirdShipment = service.findShipment('TRM-619305');
    expect(thirdShipment?.status).toBe('At Berth');
  });

  it('should swap ports in FreightCalculator and store quote draft on book', async () => {
    const fixture = TestBed.createComponent(FreightCalculator);
    const service = TestBed.inject(CargoDataService);
    await fixture.whenStable();

    const swapBtn = fixture.nativeElement.querySelector('.swap-btn') as HTMLButtonElement;
    swapBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.summary-route')?.textContent).toContain(
      'NLRTM → CNSHA',
    );

    const bookBtn = fixture.nativeElement.querySelector('.book-btn') as HTMLButtonElement;
    bookBtn.click();
    expect(service.quoteDraft()?.lane).toContain('Rotterdam');
  });

  it('should render active vessel manifests on TrackingPage and toggle FAQ items', async () => {
    const trackingFixture = TestBed.createComponent(TrackingPage);
    await trackingFixture.whenStable();
    const rows = trackingFixture.nativeElement.querySelectorAll('.manifest-table tbody tr');
    expect(rows.length).toBe(3);

    const faqFixture = TestBed.createComponent(FaqSection);
    await faqFixture.whenStable();
    const triggers = faqFixture.nativeElement.querySelectorAll('.faq-trigger');
    expect(triggers.length).toBe(5);
    (triggers[1] as HTMLButtonElement).click();
    faqFixture.detectChanges();
    expect(faqFixture.nativeElement.querySelector('.faq-answer')?.textContent).toContain(
      'FCL',
    );
  });

  it('should authenticate all four roles via unified login and render role-adapted dashboard', async () => {
    const auth = TestBed.inject(AuthService);
    const cargo = TestBed.inject(CargoDataService);

    const loginFixture = TestBed.createComponent(LoginPage);
    await loginFixture.whenStable();
    expect(loginFixture.nativeElement.querySelectorAll('.demo-card').length).toBe(4);

    const res = auth.login('lukas@eurogate-broker.de', 'pass1234', 'auto');
    expect(res.ok).toBe(true);
    expect(auth.currentRole()).toBe('dealer');

    const dashFixture = TestBed.createComponent(DashboardPage);
    await dashFixture.whenStable();
    expect(dashFixture.nativeElement.textContent).toContain('Dealer Quotes');

    auth.switchRole('admin');
    dashFixture.detectChanges();
    expect(dashFixture.nativeElement.textContent).toContain('Users & Access');

    const beforeCount = cargo.liveShipments().length;
    cargo.addShipment('Shanghai (CNSHA)', 'Rotterdam (NLRTM)', '40ft Dry');
    expect(cargo.liveShipments().length).toBe(beforeCount + 1);
  });

  it('should pre-fill ContactPage from quoteDraft and show reset notice on LoginPage', async () => {
    const cargo = TestBed.inject(CargoDataService);
    cargo.setQuoteDraft({
      mode: 'Active Reefer (-18°C)',
      lane: 'Hamburg (DEHAM) → Savannah (USSAV)',
      notes: '2 × 40ft Active Reefer',
    });

    const contactFixture = TestBed.createComponent(ContactPage);
    await contactFixture.whenStable();
    const laneInput = contactFixture.nativeElement.querySelector('#lane-input') as HTMLInputElement;
    expect(laneInput.value).toContain('Hamburg');

    const loginFixture = TestBed.createComponent(LoginPage);
    await loginFixture.whenStable();
    const auxBtn = loginFixture.nativeElement.querySelector('.aux-link') as HTMLButtonElement;
    auxBtn.click();
    await loginFixture.whenStable();
    loginFixture.detectChanges();
    expect(loginFixture.nativeElement.querySelector('.reset-notice')?.textContent).toContain(
      'Access reset instructions queued',
    );
  });

  it('should enforce role registration governance: customer self-signup, dealer pending admin approval, and admin-only staff creation', async () => {
    const cargo = TestBed.inject(CargoDataService);
    const auth = TestBed.inject(AuthService);

    const beforeQuotes = cargo.dealerQuotes().length;
    const ref = await cargo.submitQuoteRequest({
      company: 'Apex Freight',
      email: 'ops@apexfreight.io',
      mode: 'Ocean FCL (40ft HC)',
      lane: 'Shanghai (CNSHA) → Rotterdam (NLRTM)',
      notes: '4 containers monthly',
    });
    expect(ref).toMatch(/^TRM-Q/);
    expect(cargo.dealerQuotes().length).toBe(beforeQuotes + 1);

    // 1. Dealer self-registers -> starts pending & cannot sign in until Admin approves
    const dealerSignup = await auth.signUpAsync(
      'new.dealer@portbroker.com',
      'secure123',
      'Alex Mercer',
      'PortBroker GmbH',
      'dealer',
      'DE-HBG-99104',
    );
    expect(dealerSignup.ok).toBe(true);
    expect(dealerSignup.pendingApproval).toBe(true);

    const blockedLogin = await auth.signInAsync('new.dealer@portbroker.com', 'secure123');
    expect(blockedLogin.ok).toBe(false);

    // 2. Non-admin cannot create staff accounts
    await auth.signUpAsync('cust@shipper.com', 'secure123', 'Sam Shipper', 'ShipCo', 'customer');
    expect(auth.currentRole()).toBe('customer');
    const deniedStaff = await auth.createStaffByAdmin({
      fullName: 'Unauthorized',
      email: 'bad@terminus.io',
      password: 'password123',
      organization: 'Terminus',
      hubLocode: 'NLRTM',
    });
    expect(deniedStaff.ok).toBe(false);

    // 3. Admin approves dealer & creates staff account
    auth.switchRole('admin');
    const pending = auth.managedAccounts().find((a) => a.email === 'new.dealer@portbroker.com');
    expect(pending?.approvalStatus).toBe('pending');
    await auth.verifyDealer(pending!.id, 'approved');

    const approvedLogin = await auth.signInAsync('new.dealer@portbroker.com', 'secure123');
    expect(approvedLogin.ok).toBe(true);

    auth.switchRole('admin');
    const createdStaff = await auth.createStaffByAdmin({
      fullName: 'Jordan Patel',
      email: 'jordan.patel@terminus.io',
      password: 'password123',
      organization: 'Terminus Port Ops',
      hubLocode: 'NLRTM',
    });
    expect(createdStaff.ok).toBe(true);
    expect(auth.managedAccounts().some((a) => a.email === 'jordan.patel@terminus.io' && a.role === 'staff')).toBe(true);

    const beforeInv = cargo.invoices().length;
    const issued = cargo.issueInvoice(cargo.liveShipments()[0], 4500);
    expect(issued.amountUsd).toBe(4500);
    expect(cargo.invoices().length).toBe(beforeInv + 1);

    const beforeBerth = cargo.livePorts()[0].berthStatus;
    cargo.togglePortBerthStatus(cargo.livePorts()[0].code);
    expect(cargo.livePorts()[0].berthStatus).not.toBe(beforeBerth);
  });
});
