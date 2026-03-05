import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

export const customerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // In real-world rules: admin account is for managing products/orders only.
  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin/orders']);
  }

  return true;
};
