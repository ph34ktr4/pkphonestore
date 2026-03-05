import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isSubmitting = false;
  errorMessage = '';

  readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.getRawValue();
    this.auth
      .register({
        username: String(raw.username),
        email: String(raw.email),
        phone: raw.phone ? String(raw.phone) : '',
        password: String(raw.password),
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
		  const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
		  if (returnUrl) {
			this.router.navigateByUrl(returnUrl);
			return;
		  }
		  this.router.navigate(['/']);
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message;
          this.errorMessage = msg || 'Register failed.';
        },
      });
  }
}
