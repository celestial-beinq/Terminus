import { Component } from '@angular/core';

interface WhyMetric {
  value: string;
  unit: string;
  description: string;
}

@Component({
  selector: 'app-why-choose-us',
  template: `
    <section class="section-muted why-section" aria-label="Why Choose Us">
      <div class="container why-grid">
        <div class="why-left">
          <div class="kicker" data-aos="fade-down">
            <span class="kicker-square" aria-hidden="true"></span>
            <span>Why Choose Us</span>
          </div>
          <h2 data-aos="fade-right" data-aos-delay="80">
            Logistics that work as hard as your business
          </h2>
          <p class="why-lead" data-aos="fade-right" data-aos-delay="140">
            We combine experienced logistics professionals, smart technology, and a dependable
            global network to make every shipment simpler and more predictable.
          </p>

          <div class="why-metrics">
            @for (item of metrics; track item.unit; let idx = $index) {
              <div class="why-metric-row" data-aos="fade-up" [attr.data-aos-delay]="100 + idx * 70">
                <div class="why-metric-stat">
                  <span class="why-metric-val">{{ item.value }}</span>
                  <span class="why-metric-unit">{{ item.unit }}</span>
                </div>
                <p class="why-metric-desc">{{ item.description }}</p>
              </div>
            }
          </div>
        </div>

        <div class="why-right" data-aos="fade-left" data-aos-delay="140">
          <div class="why-hero-photo">
            <img
              src="/images/crane-container-lift.jpg"
              alt="Red shipping container lifted onto freight chassis at port terminal"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .why-section {
        border-top: 1px solid var(--border-subtle);
        border-bottom: 1px solid var(--border-subtle);
      }

      .why-grid {
        display: grid;
        grid-template-columns: 1.02fr 0.98fr;
        gap: 48px;
        align-items: center;
      }

      .kicker-square {
        width: 7px;
        height: 7px;
        border-radius: 1px;
        background-color: var(--accent-coral);
        display: inline-block;
        flex-shrink: 0;
      }

      .why-left h2 {
        margin: 12px 0 16px;
        max-width: 500px;
        font-size: clamp(28px, 3.2vw, 42px);
        font-weight: 600;
        line-height: 1.08;
        letter-spacing: -0.03em;
      }

      .why-lead {
        margin: 0 0 36px;
        max-width: 470px;
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-secondary);
      }

      .why-metrics {
        display: flex;
        flex-direction: column;
      }

      .why-metric-row {
        display: grid;
        grid-template-columns: 205px 1fr;
        gap: 20px;
        align-items: start;
        padding: 22px 0;
        border-top: 1px solid rgba(17, 19, 23, 0.12);
      }

      .why-metric-row:last-child {
        border-bottom: 1px solid rgba(17, 19, 23, 0.12);
      }

      .why-metric-stat {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .why-metric-val {
        font-family: var(--font-brand);
        font-size: clamp(26px, 2.5vw, 32px);
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.02em;
        color: var(--text-primary);
      }

      .why-metric-unit {
        font-size: clamp(19px, 1.8vw, 24px);
        font-weight: 400;
        line-height: 1.1;
        color: var(--text-secondary);
      }

      .why-metric-desc {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      .why-right {
        display: flex;
        width: 100%;
      }

      .why-hero-photo {
        position: relative;
        width: 100%;
        height: clamp(360px, 38vw, 440px);
        overflow: hidden;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-subtle);
        background: #121418;
      }

      .why-hero-photo img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 65%;
        display: block;
      }

      @media (max-width: 980px) {
        .why-grid {
          grid-template-columns: 1fr;
          gap: 36px;
        }

        .why-hero-photo {
          height: 300px;
        }
      }

      @media (max-width: 600px) {
        .why-metric-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
})
export class WhyChooseUs {
  protected readonly metrics: WhyMetric[] = [
    {
      value: '15+',
      unit: 'Years',
      description:
        'Years of logistics experience helping businesses simplify shipping and build stronger supply chains.',
    },
    {
      value: '120+',
      unit: 'Countries',
      description:
        'Our global network connects your business to major markets and destinations across the world.',
    },
    {
      value: '98.5%',
      unit: 'On-Time',
      description:
        'We focus on efficient planning and reliable transportation to keep your cargo moving on schedule.',
    },
    {
      value: '50K+',
      unit: 'Shipments',
      description:
        'Thousands of shipments move through our network every year with dependable service and care.',
    },
  ];
}

