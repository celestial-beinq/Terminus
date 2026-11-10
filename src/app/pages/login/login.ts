import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, DEMO_USERS, UserRole } from '../../services/auth.service';
import { BrandLogo } from '../../components/brand-logo/brand-logo';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, BrandLogo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly selectedRole = signal<UserRole | 'auto'>('auto');
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly resetNotice = signal('');

  protected readonly roleOptions: { id: UserRole | 'auto'; label: string }[] = [
    { id: 'auto', label: 'Auto-Detect' },
    { id: 'customer', label: 'Customer' },
    { id: 'dealer', label: 'Dealer' },
    { id: 'staff', label: 'Staff' },
    { id: 'admin', label: 'Admin' },
  ];

  protected readonly demoCards: {
    role: UserRole;
    title: string;
    subtitle: string;
    email: string;
  }[] = [
    {
      role: 'customer',
      title: 'Customer',
      subtitle: 'Track containers, book lanes & pay invoices',
      email: DEMO_USERS.customer.email,
    },
    {
      role: 'dealer',
      title: 'Dealer',
      subtitle: 'Manage client allocations & broker margins',
      email: DEMO_USERS.dealer.email,
    },
    {
      role: 'staff',
      title: 'Staff',
      subtitle: 'Port gate clearance, reefer & chassis ops',
      email: DEMO_USERS.staff.email,
    },
    {
      role: 'admin',
      title: 'Admin',
      subtitle: 'Fleet control, EDI feeds & role access',
      email: DEMO_USERS.admin.email,
    },
  ];

  protected submitLogin(): void {
    const result = this.auth.login(this.email(), this.password(), this.selectedRole());
    if (!result.ok) {
      this.errorMessage.set(result.error ?? 'Unable to sign in.');
      return;
    }

    this.errorMessage.set('');
    this.router.navigate(['/dashboard']);
  }

  protected signInDemo(role: UserRole): void {
    this.auth.loginAsDemo(role);
    this.router.navigate(['/dashboard']);
  }

  protected requestReset(): void {
    const target = this.email().trim() || 'your registered work email';
    this.resetNotice.set(`Access reset instructions queued for ${target}.`);
  }
}

