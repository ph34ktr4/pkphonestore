import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './contact-section.html',
  styleUrls: ['./contact-section.css']
})
export class ContactSectionComponent {
  @Input() showCta = true;
  @Input() title = 'Contact Us';
  @Input() subtitle = 'Have Question? Call us';

  @Input() brandName = 'PK Phone Store';
  @Input() logoText = 'PK';

  @Input() phones: string[] = ['081 797679', '099 797679', '090 411 140'];
  @Input() email = 'support@phoneshop.com';
  @Input() addressLines: string[] = ['Phnom Penh, Cambodia'];

  telHref(p: string): string {
    return `tel:${String(p || '').replace(/\s/g, '')}`;
  }
}
