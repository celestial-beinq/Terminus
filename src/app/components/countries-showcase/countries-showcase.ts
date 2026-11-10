import { Component, inject } from '@angular/core';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-countries-showcase',
  template: `
    <section class="section-dark countries-section" aria-label="Countries We Have Worked With">
      <div class="container countries-layout">
        <div class="countries-media" data-aos="fade-right" data-aos-duration="850">
          <img
            src="/images/ocean-vessel-aerial.jpg"
            alt="Container cargo vessel sailing across international trade corridor"
            class="countries-img"
            loading="lazy"
          />
          <div class="countries-overlay" data-aos="fade-up" data-aos-delay="200">
            <span class="overlay-num">48+</span>
            <span class="overlay-text">Countries connected via scheduled maritime &amp; intermodal corridors</span>
          </div>
        </div>

        <div class="countries-content">
          <div class="kicker" data-aos="fade-left">
            <span class="kicker-plus">+</span>
            <span>Countries We Have Worked With</span>
          </div>
          <h2 data-aos="fade-left" data-aos-delay="80">Active freight corridors across 6 continents</h2>
          <p class="countries-lead" data-aos="fade-left" data-aos-delay="140">
            Direct terminal agreements and local customs brokerage across the world's
            busiest maritime gateways.
          </p>

          <div class="countries-grid">
            @for (item of countries; track item.code; let idx = $index) {
              <div class="country-card" data-aos="zoom-in-up" [attr.data-aos-delay]="(idx % 6) * 60">
                <div class="country-top">
                  <span class="country-code">{{ item.code }}</span>
                  <span class="country-teu">{{ item.annualTeus }}</span>
                </div>
                <strong>{{ item.country }}</strong>
                <span class="country-ports">{{ item.ports }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .countries-section {
        border-top: 1px solid var(--border-dark);
      }

      .countries-layout {
        display: grid;
        grid-template-columns: 0.82fr 1.18fr;
        gap: 36px;
        align-items: stretch;
      }

      .countries-media {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-dark);
        min-height: 100%;
      }

      .countries-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .countries-overlay {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
        padding: 18px 20px;
        border-radius: var(--radius-md);
        background: rgba(8, 9, 11, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(14px);
      }

      .overlay-num {
        display: block;
        font-family: var(--font-brand);
        font-size: 34px;
        font-weight: 700;
        line-height: 1;
        color: #ffffff;
        margin-bottom: 6px;
      }

      .overlay-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
      }

      .countries-content h2 {
        margin: 10px 0 10px;
        font-size: clamp(26px, 3vw, 36px);
        letter-spacing: -0.025em;
      }

      .countries-lead {
        margin: 0 0 24px;
        color: var(--text-muted-dark);
        font-size: 14.5px;
      }

      .countries-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .country-card {
        padding: 14px;
        background: var(--bg-surface);
        border: 1px solid var(--border-dark);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .country-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2px;
      }

      .country-code {
        font-family: var(--font-brand);
        font-size: 12px;
        font-weight: 700;
        color: var(--accent-coral);
      }

      .country-teu {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .country-card strong {
        font-size: 14.5px;
        color: #ffffff;
      }

      .country-ports {
        font-size: 12px;
        color: var(--text-muted-dark);
        line-height: 1.4;
      }

      @media (max-width: 980px) {
        .countries-layout {
          grid-template-columns: 1fr;
        }

        .countries-media {
          min-height: 320px;
          height: 340px;
        }
      }

      @media (max-width: 640px) {
        .countries-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class CountriesShowcase {
  protected readonly countries = inject(CargoDataService).countries;
}

