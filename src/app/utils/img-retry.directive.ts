import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[imgRetry]',
  standalone: true
})
export class ImgRetryDirective {
  @Input() imgRetryMax = 6;
  @Input() imgRetryBaseDelayMs = 600;

  constructor(private readonly el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    const currentSrc = String(img.getAttribute('src') || img.src || '').trim();
    if (!currentSrc) return;

    const attempt = Number(img.dataset['retryAttempt'] || '0');
    if (!Number.isFinite(attempt) || attempt >= this.imgRetryMax) return;

    const nextAttempt = attempt + 1;
    img.dataset['retryAttempt'] = String(nextAttempt);

    const delay = this.imgRetryBaseDelayMs * nextAttempt;

    // Reassign src with a cache-busting param so the browser retries even after an initial failure.
    let nextUrl = currentSrc;
    try {
      const url = new URL(currentSrc, window.location.href);
      url.searchParams.set('_imgRetry', String(nextAttempt));
      url.searchParams.set('_ts', String(Date.now()));
      nextUrl = url.toString();
    } catch {
      // If URL parsing fails, fall back to simple concatenation.
      const join = currentSrc.includes('?') ? '&' : '?';
      nextUrl = `${currentSrc}${join}_imgRetry=${nextAttempt}&_ts=${Date.now()}`;
    }

    window.setTimeout(() => {
      // Only retry if src hasn't changed to something else.
      const latest = String(img.getAttribute('src') || img.src || '').trim();
      if (latest && latest !== currentSrc) return;
      img.src = nextUrl;
    }, delay);
  }
}
