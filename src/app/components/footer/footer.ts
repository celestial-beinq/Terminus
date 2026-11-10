import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '../brand-logo/brand-logo';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandLogo],
  template: `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand-col">
            <app-brand-logo variant="light" />
            <p class="footer-tagline">
              Digital ocean freight, port-to-door intermodal shipping, and unified
              container telemetry for global supply chains.
            </p>
          </div>

          <div class="footer-links-grid">
            <div class="footer-col">
              <h4>Platform</h4>
              <a routerLink="/">Overview</a>
              <a routerLink="/services">Cargo Services</a>
              <a routerLink="/tracking">Live Tracking</a>
              <a routerLink="/case-studies">Case Studies</a>
              <a routerLink="/login">Operations Portal</a>
            </div>
            <div class="footer-col">
              <h4>Company</h4>
              <a routerLink="/about">About Terminus</a>
              <a routerLink="/contact">Work With Us</a>
              <a routerLink="/contact">Request Freight Quote</a>
            </div>
            <div class="footer-col">
              <h4>Primary Hubs</h4>
              <span>Rotterdam · Maasvlakte II</span>
              <span>Singapore · Tuas Mega Port</span>
              <span>Savannah · Garden City</span>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2026 Terminus Maritime Infrastructure. All rights reserved.</span>
          <span class="footer-status">
            <span class="status-dot" aria-hidden="true"></span>
            AIS &amp; Port EDI Feeds Operational
          </span>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .site-footer {
        margin-top: auto;
        background-color: #08090b;
        color: var(--text-on-dark);
        border-top: 1px solid var(--border-dark);
        padding: 64px 0 32px;
      }

      .footer-top {
        display: grid;
        grid-template-columns: 1.2fr 2fr;
        gap: 48px;
        padding-bottom: 44px;
        border-bottom: 1px solid var(--border-dark);
      }

      .footer-tagline {
        margin: 16px 0 0;
        max-width: 340px;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--text-muted-dark);
      }

      .footer-links-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 28px;
      }

      .footer-col {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .footer-col h4 {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
      }

      .footer-col a,
      .footer-col span {
        font-size: 13.5px;
        color: rgba(255, 255, 255, 0.82);
        transition: color var(--transition-fast);
      }

      .footer-col a:hover {
        color: #ffffff;
      }

      .footer-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        padding-top: 24px;
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.58);
      }

      .footer-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #22c55e;
      }

      @media (max-width: 860px) {
        .footer-top {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 540px) {
        .footer-links-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Footer {}

