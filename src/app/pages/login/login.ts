import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, PublicSignupRole } from '../../services/auth.service';
import { BrandLogo } from '../../components/brand-logo/brand-logo';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, BrandLogo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly authMode = signal<'signin' | 'signup'>('signin');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly fullName = signal('');
  protected readonly organization = signal('');
  protected readonly businessRegNumber = signal('');
  protected readonly signupRole = signal<PublicSignupRole>('customer');
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly resetNotice = signal('');

  protected async submitLogin(): Promise<void> {
    this.errorMessage.set('');
    this.resetNotice.set('');
    this.loading.set(true);

    try {
      if (this.authMode() === 'signup') {
        const res = await this.auth.signUpAsync(
          this.email(),
          this.password(),
          this.fullName(),
          this.organization(),
          this.signupRole(),
          this.businessRegNumber(),
        );
        if (!res.ok) {
          this.errorMessage.set(res.error ?? 'Unable to create account.');
          return;
        }
        if (res.message) {
          this.resetNotice.set(res.message);
          this.authMode.set('signin');
          return;
        }
        this.router.navigate(['/dashboard']);
        return;
      }

      const result = await this.auth.signInAsync(this.email(), this.password());
      if (!result.ok) {
        this.errorMessage.set(result.error ?? 'Unable to sign in.');
        return;
      }

      this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  protected async requestReset(): Promise<void> {
    const notice = await this.auth.resetPasswordAsync(this.email());
    this.resetNotice.set(notice);
  }
}
