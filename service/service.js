/**
 * TizenViewer — enregistrement des touches média et navigation (Tizen TV).
 */

try {
  tizen.tvinputdevice.registerKey('MediaPlayPause');
  tizen.tvinputdevice.registerKey('MediaPlay');
  tizen.tvinputdevice.registerKey('MediaPause');
  tizen.tvinputdevice.registerKey('MediaStop');
  tizen.tvinputdevice.registerKey('MediaFastForward');
  tizen.tvinputdevice.registerKey('MediaRewind');
  tizen.tvinputdevice.registerKey('MediaTrackNext');
  tizen.tvinputdevice.registerKey('MediaTrackPrevious');

  tizen.tvinputdevice.registerKey('Back');
  tizen.tvinputdevice.registerKey('Enter');
  tizen.tvinputdevice.registerKey('ArrowUp');
  tizen.tvinputdevice.registerKey('ArrowDown');
  tizen.tvinputdevice.registerKey('ArrowLeft');
  tizen.tvinputdevice.registerKey('ArrowRight');
} catch (e) {
  /* hors Tizen / émulateur */
}
