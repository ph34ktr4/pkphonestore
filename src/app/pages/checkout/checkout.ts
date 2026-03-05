import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Auth } from '../../services/auth';
import { Cart } from '../../services/cart';
import { OrderService } from '../../services/order';

type PaymentSummary = {
  cardHolder: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

function cardNumberDigitsValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value || '');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { required: true };
  if (digits.length < 13 || digits.length > 19) return { digits: true };
  return null;
}

type SuccessOrderPopup = {
  orderId: string;
  detailsId: string;
  createdAt: string;
  total: number;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    note?: string;
  };
  payment: PaymentSummary;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly cart = inject(Cart);
  private readonly orders = inject(OrderService);

  readonly items$ = this.cart.items$;

  get userEmail(): string {
    return this.auth.user?.email || '';
  }

  readonly total$ = this.cart.items$.pipe(
    map((items) =>
      items.reduce((sum, i) => {
        const unit = i.product.discountPrice && i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price;
        return sum + unit * i.quantity;
      }, 0)
    )
  );

  errorMessage = '';
  isSubmitting = false;

  successPopup: SuccessOrderPopup | null = null;

  readonly infoForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    address: ['', [Validators.required, Validators.minLength(4)]],
    note: ['']
  });

  readonly paymentForm = this.fb.group({
    cardHolder: ['', [Validators.required, Validators.minLength(2)]],
    cardNumber: ['', [cardNumberDigitsValidator]],
    expMonth: ['', [Validators.required, Validators.pattern(/^(0?[1-9]|1[0-2])$/)]],
    expYear: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]]
  });

  placeOrder(): void {
    this.errorMessage = '';
    this.successPopup = null;
    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      this.errorMessage = 'Please fill in your customer information.';
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.errorMessage = 'Please fill in your card information.';
      return;
    }

    const items = this.cart.itemsSnapshot;
    if (!items.length) {
      this.errorMessage = 'Your cart is empty.';
      return;
    }

    const raw = this.infoForm.getRawValue();

    const pay = this.paymentForm.getRawValue();
    const cardNumberDigits = String(pay.cardNumber || '').replace(/\D/g, '');
    const last4 = cardNumberDigits.slice(-4);
    const expMonth = Number(String(pay.expMonth || '').trim());
    const expYear = Number(String(pay.expYear || '').trim());

    if (cardNumberDigits.length < 13 || cardNumberDigits.length > 19 || last4.length !== 4) {
      this.errorMessage = 'Invalid card number.';
      return;
    }

    // NOTE: We do NOT send/store full card number or CVV.
    // Only a safe summary (last4 + expiry) is persisted.
    const payment: PaymentSummary = {
      cardHolder: String(pay.cardHolder || '').trim(),
      last4,
      expMonth,
      expYear
    };

    const nowTotal = items.reduce((sum, i) => {
      const unit = i.product.discountPrice && i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price;
      return sum + unit * i.quantity;
    }, 0);

    const payload = {
      customer: {
        fullName: String(raw.fullName || '').trim(),
        phone: String(raw.phone || '').trim(),
        address: String(raw.address || '').trim(),
        note: String(raw.note || '').trim()
      },
      items: items.map((i) => {
        const unit = i.product.discountPrice && i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price;
        return {
          productId: String(i.product._id),
          name: String(i.product.name || ''),
          unitPrice: Number(unit),
          quantity: Number(i.quantity),
          image: i.product.image ? String(i.product.image) : ''
        };
      }),
      payment
    };

    this.isSubmitting = true;
    this.orders.createOrder(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successPopup = {
          orderId: res._id,
          detailsId: res.detailsId,
          createdAt: res.createdAt || new Date().toISOString(),
          total: Number.isFinite(res.total) ? res.total : nowTotal,
          customer: payload.customer,
          payment,
          items: payload.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }))
        };

    // Clear cart right away after successful order creation.
    // The success popup renders from `successPopup`, so it won't lose item details.
    this.cart.clear();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message;
        this.errorMessage = msg || 'Place order failed.';
      }
    });
  }

  closeSuccessPopup(): void {
    this.successPopup = null;
    this.cart.clear();
    this.infoForm.reset();
    this.paymentForm.reset();
  }
}
