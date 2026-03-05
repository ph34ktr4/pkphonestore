import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

// Allows guests + customers, blocks admins from shopping pages like Cart.
export const shopperGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin/orders']);
  }

  return true;
};
