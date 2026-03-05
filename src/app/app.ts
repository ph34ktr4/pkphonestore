import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { ContactSectionComponent } from './components/contact-section/contact-section';
import { ProductStore } from './services/product-store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Navbar, Footer, ContactSectionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('PK Phone Store');
  readonly showContactSection = signal(false);

  constructor(router: Router, productStore: ProductStore) {
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        productStore.refresh();

        const url = (e.urlAfterRedirects || e.url || '').split('?')[0];
        this.showContactSection.set(url === '/');
      });
  }
}
