import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  template: `
    <span class="brand-lockup" [class]="'brand-' + variant()">
      <svg
        class="brand-cube"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M18 3L31 10.5V25.5L18 33L5 25.5V10.5L18 3Z"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linejoin="round"
        />
        <path
          d="M5 10.5L18 18L31 10.5"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linejoin="round"
        />
        <path d="M18 18V33" stroke="currentColor" stroke-width="2.2" />
        <path d="M11.5 14.3V22.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <path d="M24.5 14.3V22.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span class="brand-wordmark">TERMINUS</span>
    </span>
  `,
  styles: [
    `
      .brand-lockup {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        user-select: none;
      }

      .brand-cube {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .brand-wordmark {
        font-family: var(--font-brand);
        font-weight: 700;
        font-size: 18px;
        letter-spacing: 0.14em;
        line-height: 1;
      }

      .brand-dark .brand-cube {
        color: var(--accent-coral);
      }

      .brand-dark .brand-wordmark {
        color: #111317;
      }

      .brand-light .brand-cube,
      .brand-light .brand-wordmark {
        color: #ffffff;
      }

      .brand-hero {
        gap: 16px;
      }

      .brand-hero .brand-cube {
        width: clamp(34px, 4vw, 52px);
        height: clamp(34px, 4vw, 52px);
        color: #ffffff;
      }

      .brand-hero .brand-wordmark {
        font-size: clamp(28px, 4vw, 48px);
        letter-spacing: 0.14em;
        color: #ffffff;
      }
    `,
  ],
})
export class BrandLogo {
  readonly variant = input<'dark' | 'light' | 'hero'>('dark');
}

