import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsStrip } from '../../components/stats-strip/stats-strip';

@Component({
  selector: 'app-about-page',
  imports: [StatsStrip, RouterLink],
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

    <section class="section-light">
      <div class="container about-grid">
        <div class="about-block">
          <span class="about-tag">01 / ARCHITECTURE</span>
          <h2>One manifest from factory gate to final warehouse dock</h2>
          <p>
            Traditional freight forwarding fragments vessel schedules, customs brokerage,
            and port drayage across disconnected spreadsheets. Terminus synchronizes AIS
            satellite feeds and terminal EDI directly into your supply chain operations.
          </p>
        </div>

        <div class="about-block">
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

      @media (max-width: 768px) {
        .about-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AboutPage {}

