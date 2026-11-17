import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const user = auth.currentUser();
  if (!user || user.approvalStatus === 'rejected') {
    void auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { error: 'account_suspended' } });
  }

  return true;
};

export function roleGuard(allowedRoles: UserRole | UserRole[]): CanActivateFn {
  return () => {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) {
      return true;
    }

    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const user = auth.currentUser();
    if (!user || user.approvalStatus === 'rejected') {
      void auth.logout();
      return router.createUrlTree(['/login']);
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (roles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
