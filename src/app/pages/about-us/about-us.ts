import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css']
})
export class AboutUsComponent {
  readonly highlights = [
    { title: 'Curated brands', desc: 'Only trusted phones and accessories.' },
    { title: 'Fast checkout', desc: 'Simple flow with clear totals.' },
    { title: 'Secure accounts', desc: 'Role-based access for admin & customers.' },
    { title: 'Real inventory', desc: 'Stock-aware add to cart & ordering.' }
  ];
}
