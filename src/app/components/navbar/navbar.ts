import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandLogo } from '../brand-logo/brand-logo';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, BrandLogo],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly pagesMenuOpen = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  protected togglePagesMenu(event: Event): void {
    event.stopPropagation();
    this.pagesMenuOpen.update((open) => !open);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMenus(): void {
    this.pagesMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.pagesMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.closeMenus();
  }
}

