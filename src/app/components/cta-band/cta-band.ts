import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SilentVideoDirective } from '../../directives/silent-video.directive';

@Component({
  selector: 'app-cta-band',
  imports: [RouterLink, SilentVideoDirective],
  template: `
    <section class="section-dark cta-band" [attr.aria-label]="kicker()">
      <video
        appSilentVideo
        class="cta-video"
        src="/videos/cargo-operations.mp4"
        [poster]="poster()"
        autoplay
        muted
        [muted]="true"
        [volume]="0"
        loop
        playsinline
        aria-hidden="true"
      ></video>
      <div class="cta-backdrop" aria-hidden="true"></div>
      <div class="container cta-inner">
        <div data-aos="fade-up-right" data-aos-duration="800">
          <div class="kicker">
            <span class="kicker-plus">+</span>
            <span>{{ kicker() }}</span>
          </div>
          <h2>{{ heading() }}</h2>
          <p>{{ description() }}</p>
        </div>
        <div class="cta-actions" data-aos="fade-up-left" data-aos-delay="150" data-aos-duration="800">
          <a [routerLink]="primaryRoute()" class="btn btn-light">{{ primaryLabel() }}</a>
          <a [routerLink]="secondaryRoute()" class="link-underline">{{ secondaryLabel() }}</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .cta-band {
        position: relative;
        overflow: hidden;
        border-top: 1px solid var(--border-dark);
        min-height: 440px;
        display: flex;
        align-items: center;
        padding: 96px 0;
        background-color: #07080a;
      }

      .cta-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        pointer-events: none;
      }

      .cta-backdrop {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          95deg,
          rgba(7, 8, 10, 0.74) 0%,
          rgba(7, 8, 10, 0.46) 52%,
          rgba(7, 8, 10, 0.24) 100%
        );
        pointer-events: none;
      }

      .cta-inner {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 32px;
        flex-wrap: wrap;
      }

      .cta-inner h2 {
        margin: 10px 0 12px;
        max-width: 580px;
        font-size: clamp(26px, 3vw, 36px);
        line-height: 1.15;
        letter-spacing: -0.02em;
      }

      .cta-inner p {
        margin: 0;
        max-width: 520px;
        color: var(--text-muted-dark);
      }

      .cta-actions {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class CtaBand {
  readonly kicker = input('Get Started Today');
  readonly heading = input('Move your next container allocation with zero guesswork.');
  readonly description = input(
    'Connect your ERP, lock priority vessel capacity across 140+ ports, and monitor every berth handoff in real time.',
  );
  readonly primaryLabel = input('Request Freight Quote');
  readonly primaryRoute = input('/contact');
  readonly secondaryLabel = input('Track a Container');
  readonly secondaryRoute = input('/tracking');
  readonly poster = input('/images/container-deck-sea.jpg');
}
