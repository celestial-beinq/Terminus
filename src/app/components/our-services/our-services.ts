import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ServiceAccordionItem {
  number: string;
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl: string;
  imageAlt: string;
}

@Component({
  selector: 'app-our-services',
  imports: [RouterLink],
  template: `
    <section class="section-muted our-services-section" aria-label="Our Services">
      <div class="container">
        <div class="services-header">
          <div data-aos="fade-right">
            <div class="kicker">
              <span class="kicker-square" aria-hidden="true"></span>
              <span>Our Services</span>
            </div>
            <h2>Everything you need to keep goods moving</h2>
          </div>
          <p class="services-header-sub" data-aos="fade-left" data-aos-delay="100">
            Flexible logistics services built around your cargo, timeline, destination, and
            business requirements.
          </p>
        </div>

        <div class="services-layout">
          <aside class="services-help-aside" data-aos="fade-right" data-aos-delay="100">
            <div class="help-photo-wrap">
              <img
                src="/images/case-study-operator.jpg"
                alt="Terminus warehouse specialist coordinating cargo dispatch"
                loading="lazy"
              />
            </div>

            <h3>Need Help Choosing the Right Service?</h3>
            <p class="help-copy">
              Speak with our customer service team about your shipment, route, timeline, and
              logistics requirements. We're here to help you find the right solution.
            </p>

            <div class="help-contact">
              <a href="tel:+19125550194">+1 (912) 555-0194</a>
              <a href="mailto:support@terminuscargo.com">support@terminuscargo.com</a>
            </div>

            <div class="help-advisor">
              <img
                src="/images/case-study-operator.jpg"
                alt="Sarah Mitchell, Customer Service Manager"
                class="advisor-avatar"
                loading="lazy"
              />
              <div>
                <span class="advisor-name">— SARAH MITCHELL</span>
                <span class="advisor-role">Customer Service Manager</span>
              </div>
            </div>
          </aside>

          <div class="services-accordion" data-aos="fade-left" data-aos-delay="120">
            @for (service of services; track service.number; let idx = $index) {
              <article
                class="accordion-card"
                [class.is-open]="activeIndex() === idx"
              >
                <button
                  type="button"
                  class="accordion-trigger"
                  [attr.aria-expanded]="activeIndex() === idx"
                  [attr.aria-controls]="'service-panel-' + service.number"
                  (click)="toggle(idx)"
                >
                  <span class="accordion-num">{{ service.number }}</span>
                  <span class="accordion-title">{{ service.title }}</span>
                  <span class="accordion-icon" aria-hidden="true">
                    {{ activeIndex() === idx ? '−' : '+' }}
                  </span>
                </button>

                @if (activeIndex() === idx) {
                  <div class="accordion-body" [id]="'service-panel-' + service.number">
                    <p class="accordion-desc">{{ service.description }}</p>
                    <a routerLink="/services" class="btn btn-light accordion-cta">
                      <span>{{ service.ctaLabel }}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <div class="accordion-media">
                      <img
                        [src]="service.imageUrl"
                        [alt]="service.imageAlt"
                        loading="lazy"
                      />
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .our-services-section {
        border-top: 1px solid var(--border-subtle);
        border-bottom: 1px solid var(--border-subtle);
      }

      .services-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 40px;
      }

      .kicker-square {
        width: 7px;
        height: 7px;
        border-radius: 1px;
        background-color: var(--accent-coral);
        display: inline-block;
        flex-shrink: 0;
      }

      .services-header h2 {
        margin: 12px 0 0;
        max-width: 440px;
        font-size: clamp(28px, 3.2vw, 40px);
        font-weight: 600;
        line-height: 1.08;
        letter-spacing: -0.03em;
      }

      .services-header-sub {
        margin: 0;
        max-width: 340px;
        font-size: 14px;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      .services-layout {
        display: grid;
        grid-template-columns: 270px 1fr;
        gap: 36px;
        align-items: start;
      }

      .services-help-aside {
        display: flex;
        flex-direction: column;
      }

      .help-photo-wrap {
        border-radius: var(--radius-sm);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        margin-bottom: 20px;
        aspect-ratio: 16 / 10;
        background: #121418;
      }

      .help-photo-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 22%;
      }

      .services-help-aside h3 {
        margin: 0 0 10px;
        font-size: 17px;
        font-weight: 600;
        line-height: 1.28;
        letter-spacing: -0.015em;
        color: var(--text-primary);
      }

      .help-copy {
        margin: 0 0 20px;
        font-size: 13px;
        line-height: 1.58;
        color: var(--text-secondary);
      }

      .help-contact {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 20px;
        font-size: 13.5px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .help-contact a {
        transition: color var(--transition-fast);
      }

      .help-contact a:hover {
        color: var(--accent-coral);
      }

      .help-advisor {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .advisor-avatar {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        object-fit: cover;
        object-position: center top;
        border: 1px solid var(--border-subtle);
        flex-shrink: 0;
      }

      .advisor-name {
        display: block;
        font-family: var(--font-brand);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--text-primary);
      }

      .advisor-role {
        display: block;
        font-size: 11.5px;
        font-weight: 500;
        color: var(--accent-coral);
      }

      .services-accordion {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .accordion-card {
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        overflow: hidden;
        transition: background-color var(--transition-fast), border-color var(--transition-fast);
      }

      .accordion-card.is-open {
        background: #08090b;
        border-color: #08090b;
        color: #ffffff;
      }

      .accordion-trigger {
        width: 100%;
        padding: 20px 26px;
        background: transparent;
        border: 0;
        display: grid;
        grid-template-columns: 72px 1fr auto;
        align-items: center;
        gap: 16px;
        text-align: left;
        color: inherit;
        cursor: pointer;
      }

      .accordion-num {
        font-family: var(--font-brand);
        font-size: 15px;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .accordion-card.is-open .accordion-num {
        color: rgba(255, 255, 255, 0.72);
      }

      .accordion-title {
        font-size: 19px;
        font-weight: 600;
        letter-spacing: -0.015em;
      }

      .accordion-icon {
        font-size: 20px;
        font-weight: 400;
        line-height: 1;
        color: inherit;
        opacity: 0.82;
      }

      .accordion-body {
        padding: 0 26px 32px 114px;
      }

      .accordion-desc {
        margin: 0 0 20px;
        max-width: 500px;
        font-size: 14px;
        line-height: 1.6;
        color: rgba(248, 249, 250, 0.78);
      }

      .accordion-cta {
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 24px;
      }

      .accordion-media {
        max-width: 440px;
        height: 215px;
        border-radius: var(--radius-sm);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.14);
      }

      .accordion-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      @media (max-width: 920px) {
        .services-layout {
          grid-template-columns: 1fr;
          gap: 32px;
        }

        .services-help-aside {
          max-width: 420px;
        }
      }

      @media (max-width: 640px) {
        .accordion-trigger {
          padding: 18px 18px;
          grid-template-columns: 44px 1fr auto;
          gap: 10px;
        }

        .accordion-title {
          font-size: 17px;
        }

        .accordion-body {
          padding: 0 18px 24px 18px;
        }

        .accordion-media {
          height: 190px;
        }
      }
    `,
  ],
})
export class OurServices {
  protected readonly activeIndex = signal<number | null>(0);

  protected readonly services: ServiceAccordionItem[] = [
    {
      number: '01',
      title: 'Ocean Freight',
      description:
        'Move large-volume cargo across international trade lanes with reliable ocean freight solutions, flexible schedules, and end-to-end shipment visibility.',
      ctaLabel: 'Explore Ocean Freight',
      imageUrl: '/images/container-deck-sea.jpg',
      imageAlt: 'Container vessel carrying cargo containers across open ocean',
    },
    {
      number: '02',
      title: 'Air Freight',
      description:
        'Priority air cargo corridors for time-critical components, pharmaceuticals, and high-value freight backed by expedited customs clearance.',
      ctaLabel: 'Explore Air Freight',
      imageUrl: '/images/multimodal-freight.jpg',
      imageAlt: 'Cargo aircraft, container ship, and freight transport corridor',
    },
    {
      number: '03',
      title: 'Road Freight',
      description:
        'Synchronized port drayage, dedicated chassis dispatch, and regional FTL linehaul engineered to keep containers moving without demurrage.',
      ctaLabel: 'Explore Road Freight',
      imageUrl: '/images/crane-container-lift.jpg',
      imageAlt: 'Freight truck loading container at port terminal',
    },
    {
      number: '04',
      title: 'Warehousing',
      description:
        'Bonded port-side storage, barcode-verified cross-docking, and container devanning facilities positioned at major global gateways.',
      ctaLabel: 'Explore Warehousing',
      imageUrl: '/images/case-study-operator.jpg',
      imageAlt: 'Warehouse logistics coordinator managing fulfillment racks',
    },
    {
      number: '05',
      title: 'Freight Forwarding',
      description:
        'Unified carrier booking, digital Bill of Lading management, and automated customs brokerage across 120+ international markets.',
      ctaLabel: 'Explore Freight Forwarding',
      imageUrl: '/images/hero-cargo-port.jpg',
      imageAlt: 'Deepwater container port terminal with gantry cranes',
    },
    {
      number: '06',
      title: 'Last-Mile Delivery',
      description:
        'Direct regional distribution from port hubs to retail docks and fulfillment centers with live milestone telemetry and proof of delivery.',
      ctaLabel: 'Explore Last-Mile Delivery',
      imageUrl: '/images/ocean-vessel-aerial.jpg',
      imageAlt: 'Global maritime logistics corridor connecting inland delivery routes',
    },
  ];

  protected toggle(index: number): void {
    this.activeIndex.update((current) => (current === index ? null : index));
  }
}

