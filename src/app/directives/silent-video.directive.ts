import { Directive, ElementRef, HostListener, OnInit, inject } from '@angular/core';

@Directive({
  selector: 'video[appSilentVideo]',
})
export class SilentVideoDirective implements OnInit {
  private readonly videoRef = inject<ElementRef<HTMLVideoElement>>(ElementRef);

  ngOnInit(): void {
    this.enforceMute();
  }

  @HostListener('loadedmetadata')
  @HostListener('canplay')
  @HostListener('play')
  @HostListener('playing')
  @HostListener('volumechange')
  protected enforceMute(): void {
    const video = this.videoRef.nativeElement;
    video.defaultMuted = true;
    if (!video.muted) {
      video.muted = true;
    }
    if (video.volume !== 0) {
      video.volume = 0;
    }
  }
}

