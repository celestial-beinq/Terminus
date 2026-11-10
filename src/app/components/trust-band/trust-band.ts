import { Component } from '@angular/core';

@Component({
  selector: 'app-trust-band',
  template: `
    <section class="trust-band" aria-label="Trusted Partners and Certifications">
      <div class="container">
        <div class="trust-header">
          <div class="kicker" data-aos="fade-right">
            <span class="kicker-plus">+</span>
            <span>Trusted By Enterprise Supply Chains</span>
          </div>
          <div class="cert-row" data-aos="fade-left" data-aos-delay="100">
            <span class="cert-pill">ISO 28000 Security</span>
            <span class="cert-pill">C-TPAT Tier 3</span>
            <span class="cert-pill">AEO Customs Certified</span>
            <span class="cert-pill">BIMCO Digital EDI</span>
          </div>
        </div>

        <div class="partner-strip">
          <span class="partner-name" data-aos="zoom-in" data-aos-delay="0">Terminus ™</span>
          <span class="partner-name" data-aos="zoom-in" data-aos-delay="80">NORDIC COLDFREIGHT</span>
          <span class="partner-name" data-aos="zoom-in" data-aos-delay="160">EUROGATE MARITIME</span>
          <span class="partner-name" data-aos="zoom-in" data-aos-delay="240">VANGUARD INDUSTRIAL</span>
          <span class="partner-name" data-aos="zoom-in" data-aos-delay="320">PACIFIC TERMINAL GROUP</span>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .trust-band {
        background-color: var(--bg-light);
        color: var(--text-primary);
        border-top: 1px solid var(--border-subtle);
        border-bottom: 1px solid var(--border-subtle);
        padding: 40px 0;
      }

      .trust-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }

      .cert-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .cert-pill {
        font-size: 12px;
        font-weight: 600;
        padding: 5px 11px;
        border-radius: 999px;
        background: #ffffff;
        border: 1px solid rgba(17, 19, 23, 0.12);
        color: var(--text-primary);
      }

      .partner-strip {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 16px;
        padding-top: 20px;
        border-top: 1px solid var(--border-subtle);
      }

      .partner-name {
        font-family: var(--font-brand);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #3f4552;
        text-align: center;
        padding: 12px 8px;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
      }

      @media (max-width: 920px) {
        .partner-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .partner-strip {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TrustBand { }

