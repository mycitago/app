(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MyCitaGoOAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function inviteForOAuth(href) {
    try {
      return new URL(href).searchParams.get('invite') || '';
    } catch (_) {
      return '';
    }
  }

  function isOAuthCallback(href) {
    try {
      const url = new URL(href);
      return url.searchParams.get('oauth') === '1'
        || /(?:^|[&#])access_token=/.test(url.hash)
        || /(?:^|[&#])error=/.test(url.hash)
        || url.searchParams.has('error');
    } catch (_) {
      return false;
    }
  }

  function oauthErrorFromHash(href) {
    try {
      const url = new URL(href);
      const hash = url.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      const queryParams = url.searchParams;
      return hashParams.get('error_description')
        || hashParams.get('error')
        || queryParams.get('error_description')
        || queryParams.get('error')
        || null;
    } catch (_) {
      return null;
    }
  }

  function cleanOAuthUrl(href) {
    const url = new URL(href);
    url.searchParams.delete('oauth');
    url.searchParams.delete('invite');
    url.searchParams.delete('view');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.hash = '';
    return `${url.pathname}${url.search}`;
  }

  function waitForAuthSession(client, options) {
    const timeoutMs = Math.max(0, Number(options?.timeoutMs ?? 4000));

    return new Promise((resolve) => {
      let finished = false;
      let timer = null;
      let subscription = null;

      const finish = (session) => {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        subscription?.unsubscribe?.();
        resolve(session?.user ? session : null);
      };

      const authListener = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) finish(session);
      });
      subscription = authListener?.data?.subscription || null;

      // IMPORTANT: do not call getSession() here. Supabase can keep its
      // internal auth lock while restoring storage/URL state. A timed-out
      // getSession() continues running in the background and can then block
      // signInWithOAuth(), leaving the button stuck on “Abriendo Google…”.
      // INITIAL_SESSION / SIGNED_IN events are enough for callback restoration.
      timer = setTimeout(() => finish(null), timeoutMs);
    });
  }

  return {
    inviteForOAuth,
    isOAuthCallback,
    oauthErrorFromHash,
    cleanOAuthUrl,
    waitForAuthSession
  };
});
