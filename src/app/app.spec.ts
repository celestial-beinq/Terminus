import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { HomePage } from './pages/home/home';
import { CargoDataService } from './services/cargo-data.service';

describe('Terminus Cargo Platform', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HomePage],
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
  });
});
