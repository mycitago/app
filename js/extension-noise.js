(function (root) {
  'use strict';

  function isInjectedExtension403(reason) {
    if (!reason || typeof reason !== 'object') return false;
    return reason.code === 403 &&
      reason.httpStatus === 200 &&
      reason.httpError === false &&
      typeof reason.name === 'string' &&
      reason.name.length <= 2 &&
      !('message' in reason) &&
      !('details' in reason) &&
      !('hint' in reason);
  }

  root.MyCitaGoConsoleGuard = { isInjectedExtension403 };
  root.addEventListener('unhandledrejection', function (event) {
    if (isInjectedExtension403(event.reason)) event.preventDefault();
  });
})(window);
