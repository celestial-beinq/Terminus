import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsStrip } from '../../components/stats-strip/stats-strip';
import { TrustBand } from '../../components/trust-band/trust-band';
import { CountriesShowcase } from '../../components/countries-showcase/countries-showcase';
import { CtaBand } from '../../components/cta-band/cta-band';

interface CommandHub {
  code: string;
  region: string;
  city: string;
  window: string;
  focus: string;
}

interface OperatingStandard {
  code: string;
  metric: string;
  title: string;
  summary: string;
}

@Component({
  selector: 'app-about-page',
  imports: [StatsStrip, TrustBand, CountriesShowcase, CtaBand, RouterLink],
  template: `
    <section class="page-header-band">
      <div class="container">
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>About Terminus</span>
        </div>
        <h1>Maritime reliability built on unified container telemetry</h1>
        <p>
          Terminus unifies ocean carrier capacity, automated customs filings, and inland
          drayage dispatch into one operating layer for global shippers.
        </p>
      </div>
    </section>

    <app-stats-strip />

    <app-trust-band />

    <section class="section-light">
      <div class="container about-grid">
        <div class="about-block" data-aos="fade-right">
          <span class="about-tag">01 / ARCHITECTURE</span>
          <h2>One manifest from factory gate to final warehouse dock</h2>
          <p>
            Traditional freight forwarding fragments vessel schedules, customs brokerage,
            and port drayage across disconnected spreadsheets. Terminus synchronizes AIS
            satellite feeds and terminal EDI directly into your supply chain operations.
          </p>
        </div>

        <div class="about-block" data-aos="fade-left" data-aos-delay="100">
          <span class="about-tag">02 / PORT CORRIDORS</span>
          <h2>Direct berth allocations across major global trade lanes</h2>
          <p>
            From Shanghai, Singapore, and Busan to Rotterdam, Hamburg, Savannah, and Long
            Beach, our carrier partnerships protect container space even during peak
            seasonal surges.
          </p>
          <a routerLink="/contact" class="btn btn-dark about-btn">Speak With Operations</a>
        </div>
      </div>
    </section>

    <app-countries-showcase />

    <section class="section-muted command-section" aria-label="Global Command Network and Operating Standards">
      <div class="container">
        <div class="command-head">
          <div data-aos="fade-right">
            <div class="kicker">
              <span class="kicker-plus">+</span>
              <span>Global Command Network</span>
            </div>
            <h2>24/7 regional port desks built for zero-surprise handoffs</h2>
          </div>
          <p class="command-lead" data-aos="fade-left" data-aos-delay="80">
            Our maritime operations engineers and licensed customs brokers staff four
            regional dispatch hubs around the clock—resolving berth shifts, chassis
            queues, and border holds before vessels drop anchor.
          </p>
        </div>

        <div class="command-layout">
          <div class="command-visual" data-aos="zoom-in-up">
            <img
              src="/images/case-study-operator.jpg"
              alt="Terminus maritime dispatch specialist monitoring live vessel and container telemetry"
              class="command-img"
              loading="lazy"
            />
            <div class="command-badge">
              <span class="command-badge-kicker">ROUND-THE-CLOCK DISPATCH</span>
              <strong>4 Regional Control Centers · 24/7/365</strong>
            </div>
          </div>

          <div class="hubs-grid">
            @for (hub of commandHubs; track hub.code; let idx = $index) {
              <article class="hub-card" data-aos="fade-up" [attr.data-aos-delay]="idx * 70">
                <div class="hub-top">
                  <span class="hub-code">{{ hub.code }}</span>
                  <span class="hub-region">{{ hub.region }}</span>
                </div>
                <h3>{{ hub.city }}</h3>
                <span class="hub-window">{{ hub.window }}</span>
                <p>{{ hub.focus }}</p>
              </article>
            }
          </div>
        </div>

        <div class="standards-grid">
          @for (item of operatingStandards; track item.code; let idx = $index) {
            <div class="standard-card" data-aos="fade-up" [attr.data-aos-delay]="idx * 90">
              <div class="standard-top">
                <span class="about-tag">{{ item.code }}</span>
                <strong class="standard-metric">{{ item.metric }}</strong>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.summary }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <app-cta-band
      kicker="Partner With Terminus"
      heading="Ready to unify your ocean, customs, and drayage stack?"
      description="Schedule a lane audit with our maritime operations team or explore live customer deployments across 140+ global terminals."
      primaryLabel="Speak With Operations"
      primaryRoute="/contact"
      secondaryLabel="View Case Studies"
      secondaryRoute="/case-studies"
      poster="/images/crane-container-lift.jpg"
    />
  `,
  styles: [
    `
      .about-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 36px;
      }

      .about-block {
        padding: 32px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        background: #fafbfc;
      }

      .about-tag {
        font-family: var(--font-brand);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--accent-coral);
      }

      .about-block h2 {
        margin: 12px 0;
        font-size: 24px;
        letter-spacing: -0.02em;
      }

      .about-block p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.65;
      }

      .about-btn {
        margin-top: 22px;
      }

      .command-head {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 32px;
        align-items: end;
        margin-bottom: 36px;
      }

      .command-head h2 {
        margin: 10px 0 0;
        font-size: clamp(26px, 3vw, 38px);
        line-height: 1.12;
        letter-spacing: -0.025em;
      }

      .command-lead {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.65;
        font-size: 15px;
      }

      .command-layout {
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 28px;
        align-items: stretch;
        margin-bottom: 28px;
      }

      .command-visual {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        min-height: 360px;
      }

      .command-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center top;
      }

      .command-badge {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
        background: rgba(10, 11, 13, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(12px);
        color: #ffffff;
      }

      .command-badge-kicker {
        display: block;
        font-family: var(--font-brand);
        font-size: 11px;
        letter-spacing: 0.12em;
        color: var(--accent-coral);
        margin-bottom: 4px;
      }

      .hubs-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .hub-card {
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 22px;
        display: flex;
        flex-direction: column;
      }

      .hub-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }

      .hub-code {
        font-family: var(--font-brand);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--accent-coral);
      }

      .hub-region {
        font-size: 11.5px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 999px;
        background: #f3f4f6;
        color: var(--text-primary);
      }

      .hub-card h3 {
        margin: 0 0 4px;
        font-size: 17px;
      }

      .hub-window {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 10px;
      }

      .hub-card p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      .standards-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
      }

      .standard-card {
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 24px;
      }

      .standard-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .standard-metric {
        font-family: var(--font-brand);
        font-size: 22px;
        line-height: 1;
        color: var(--text-primary);
      }

      .standard-card h3 {
        margin: 0 0 8px;
        font-size: 18px;
      }

      .standard-card p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--text-secondary);
      }

      @media (max-width: 960px) {
        .command-head,
        .command-layout,
        .standards-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .about-grid,
        .hubs-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AboutPage {
  protected readonly commandHubs: CommandHub[] = [
    {
      code: 'NLRTM · EMEA HQ',
      region: 'Europe',
      city: 'Rotterdam Maasvlakte',
      window: 'UTC+1 · 24/7 Port Desk',
      focus: 'Direct Maasvlakte II berth coordination, EU customs clearance, and Rhine barge links.',
    },
    {
      code: 'SGSIN · APAC HUB',
      region: 'Southeast Asia',
      city: 'Singapore Tuas Terminal',
      window: 'UTC+8 · Cold Chain & Transshipment',
      focus: 'Malacca corridor vessel routing, reefer shore-power monitoring, and LCL hubbing.',
    },
    {
      code: 'CNSHA · EAST ASIA',
      region: 'Greater China',
      city: 'Shanghai Yangshan Desk',
      window: 'UTC+8 · Export & FCL Protection',
      focus: 'Factory-gate drayage dispatch, export manifest filing, and contracted carrier space.',
    },
    {
      code: 'USSAV / USLGB',
      region: 'North America',
      city: 'Savannah & Long Beach',
      window: 'UTC-5 / -8 · CBP & Intermodal Rail',
      focus: 'Electronic CBP pre-clearance, Pier T rail ramp transfers, and zero-demurrage chassis pools.',
    },
  ];

  protected readonly operatingStandards: OperatingStandard[] = [
    {
      code: '01 / TELEMETRY SLA',
      metric: '15 min',
      title: 'Continuous AIS & Reefer Sync',
      summary:
        'Vessel coordinates, berth ETA shifts, and cold-chain thermal logs stream into customer ERPs every 15 minutes.',
    },
    {
      code: '02 / BORDER CLEARANCE',
      metric: '99.4%',
      title: 'Pre-Arrival Customs Filing',
      summary:
        'Automated EDI/API declarations clear port inspection queues prior to discharge so containers roll straight to chassis.',
    },
    {
      code: '03 / CAPACITY PROTECTION',
      metric: '52 wks',
      title: 'Contracted Carrier Allocations',
      summary:
        'Fixed weekly TEU space agreements across major East–West corridors safeguard shippers from peak-season rollovers.',
    },
  ];
}
