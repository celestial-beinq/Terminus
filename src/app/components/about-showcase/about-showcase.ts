import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-showcase',
  imports: [RouterLink],
  template: `
    <section class="section-light" aria-label="About Terminus">
      <div class="container about-showcase-grid">
        <div class="about-copy">
          <div class="kicker" data-aos="fade-down">
            <span class="kicker-plus">+</span>
            <span>About Us</span>
          </div>
          <h2 data-aos="fade-right" data-aos-delay="80">Digital freight infrastructure built for global maritime trade</h2>
          <p class="about-lead" data-aos="fade-right" data-aos-delay="150">
            Terminus connects ocean carriers, air cargo corridors, customs brokerage, and
            inland port drayage into a single operating layer. Whether moving a single
            40ft container or managing thousands of annual TEUs, every milestone stays
            synchronized in real time.
          </p>

          <div class="about-pillars">
            <div class="pillar" data-aos="fade-up" data-aos-delay="180">
              <span class="pillar-code">01</span>
              <div>
                <strong>Multimodal Precision</strong>
                <p>Coordinated ocean, air, rail, and chassis dispatch under one Bill of Lading.</p>
              </div>
            </div>
            <div class="pillar" data-aos="fade-up" data-aos-delay="260">
              <span class="pillar-code">02</span>
              <div>
                <strong>Zero-Demurrage Execution</strong>
                <p>Pre-cleared customs declarations and automated terminal gate appointments.</p>
              </div>
            </div>
          </div>

          <div class="about-actions" data-aos="fade-up" data-aos-delay="320">
            <a routerLink="/about" class="btn btn-dark">Explore Our Story</a>
            <a routerLink="/services" class="link-underline">View Freight Modes</a>
          </div>
        </div>

        <div class="about-media" data-aos="zoom-in-left" data-aos-delay="150">
          <img
            src="/images/multimodal-freight.jpg"
            alt="Air cargo, container vessel with gantry crane, and inland freight truck"
            class="about-img"
            loading="lazy"
          />
          <div class="about-badge" data-aos="fade-up" data-aos-delay="300">
            <span class="badge-kicker">UNIFIED CORRIDORS</span>
            <strong>140+ Ports · Air, Sea &amp; Land</strong>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .about-showcase-grid {
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 48px;
        align-items: stretch;
      }

      .about-copy h2 {
        margin: 12px 0 16px;
        font-size: clamp(28px, 3.2vw, 40px);
        line-height: 1.1;
        letter-spacing: -0.025em;
      }

      .about-lead {
        margin: 0 0 28px;
        font-size: 15.5px;
        line-height: 1.65;
        color: var(--text-secondary);
      }

      .about-pillars {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 30px;
      }

      .pillar {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px;
        background: #f8f9fb;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
      }

      .pillar-code {
        font-family: var(--font-brand);
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-coral);
        padding-top: 2px;
      }

      .pillar strong {
        display: block;
        font-size: 15px;
        margin-bottom: 3px;
      }

      .pillar p {
        margin: 0;
        font-size: 13.5px;
        color: var(--text-secondary);
      }

      .about-actions {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .about-media {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        min-height: 100%;
      }

      .about-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .about-badge {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
        background: rgba(10, 11, 13, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #ffffff;
      }

      .badge-kicker {
        display: block;
        font-family: var(--font-brand);
        font-size: 11px;
        letter-spacing: 0.12em;
        color: var(--accent-coral);
        margin-bottom: 4px;
      }

      .about-badge strong {
        font-size: 15px;
        font-weight: 600;
      }

      @media (max-width: 900px) {
        .about-showcase-grid {
          grid-template-columns: 1fr;
        }

        .about-media {
          height: 340px;
        }
      }
    `,
  ],
})
export class AboutShowcase {}

