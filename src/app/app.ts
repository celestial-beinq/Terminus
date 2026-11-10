import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, afterNextRender, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      void import('aos').then(({ default: AOS }) => {
        AOS.init({
          duration: 750,
          easing: 'ease-out-cubic',
          once: false,
          mirror: true,
          offset: 60,
        });

        this.router.events
          .pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe(() => {
            setTimeout(() => AOS.refreshHard(), 60);
          });
      });
    });
  }
}
