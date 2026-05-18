/* Spatial Navigation Polyfill
 *
 * It follows W3C official specification
 * https://drafts.csswg.org/css-nav-1/
 *
 * Copyright (c) 2018-2019 LG Electronics Inc.
 * https://github.com/WICG/spatial-navigation/polyfill
 *
 * Licensed under the MIT license (MIT)
 */

(function () {
  if ('navigate' in window) {
    return;
  }

  const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};

  init();

  function getDirectionFromKey(e) {
    return ARROW_KEY_CODE[e.keyCode];
  }

  function findNextFocusableElement(currentElement, direction) {
    const candidateElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const visibleCandidates = Array.from(candidateElements).filter(function (el) {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;
    });

    if (!visibleCandidates.length) return null;

    const currentRect = currentElement.getBoundingClientRect();
    let closestElement = null;
    let closestDistance = Infinity;

    for (let i = 0; i < visibleCandidates.length; i++) {
      const candidate = visibleCandidates[i];
      if (candidate === currentElement) continue;

      const candidateRect = candidate.getBoundingClientRect();

      let inDirection = false;
      switch (direction) {
        case 'up':
          inDirection = candidateRect.bottom < currentRect.top;
          break;
        case 'down':
          inDirection = candidateRect.top > currentRect.bottom;
          break;
        case 'left':
          inDirection = candidateRect.right < currentRect.left;
          break;
        case 'right':
          inDirection = candidateRect.left > currentRect.right;
          break;
      }

      if (inDirection) {
        const dx =
          candidateRect.left + candidateRect.width / 2 - (currentRect.left + currentRect.width / 2);
        const dy =
          candidateRect.top + candidateRect.height / 2 - (currentRect.top + currentRect.height / 2);

        let distance;
        switch (direction) {
          case 'up':
          case 'down':
            distance = Math.abs(dy) + Math.abs(dx) * 0.5;
            break;
          case 'left':
          case 'right':
            distance = Math.abs(dx) + Math.abs(dy) * 0.5;
            break;
        }

        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = candidate;
        }
      }
    }

    return closestElement;
  }

  function ensureElementIsVisible(element) {
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  function handleKeydown(e) {
    const direction = getDirectionFromKey(e);
    if (!direction) return;

    e.preventDefault();

    const currentElement = document.activeElement || document.body;
    const nextElement = findNextFocusableElement(currentElement, direction);

    if (nextElement) {
      const prevFocused = document.querySelector('.tizenviewer-focused');
      if (prevFocused) {
        prevFocused.classList.remove('tizenviewer-focused');
      }

      nextElement.classList.add('tizenviewer-focused');
      ensureElementIsVisible(nextElement);
      nextElement.focus();
    }
  }

  function init() {
    document.addEventListener('keydown', handleKeydown);

    window.__spatialNavigation__ = {
      keyMode: 'ARROW',
      findNextFocusableElement: findNextFocusableElement,
      ensureElementIsVisible: ensureElementIsVisible
    };

    window.navigate = function (direction) {
      const currentElement = document.activeElement || document.body;
      const nextElement = findNextFocusableElement(currentElement, direction);

      if (nextElement) {
        const prevFocused = document.querySelector('.tizenviewer-focused');
        if (prevFocused) {
          prevFocused.classList.remove('tizenviewer-focused');
        }

        nextElement.classList.add('tizenviewer-focused');
        ensureElementIsVisible(nextElement);
        nextElement.focus();
        return true;
      }

      return false;
    };
  }
})();
