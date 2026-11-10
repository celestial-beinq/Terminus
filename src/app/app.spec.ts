import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { HomePage } from './pages/home/home';
import { TrackingPage } from './pages/tracking/tracking';
import { LoginPage } from './pages/login/login';
import { DashboardPage } from './pages/dashboard/dashboard';
import { FreightCalculator } from './components/freight-calculator/freight-calculator';
import { FaqSection } from './components/faq-section/faq-section';
import { CargoDataService } from './services/cargo-data.service';
import { AuthService } from './services/auth.service';

describe('Terminus Cargo Platform', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        HomePage,
        TrackingPage,
        LoginPage,
        DashboardPage,
        FreightCalculator,
        FaqSection,
      ],
      providers: [provideRouter(routes)],
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
});
