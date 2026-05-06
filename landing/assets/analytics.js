/* Disiplan landing analytics — PostHog Cloud (EU)
 * Event taxonomy: docs/admin/EVENT_TAXONOMY.md
 * Tüm landing sayfaları bu dosyayı yükler. surface = 'landing'
 */
(function () {
  // PostHog snippet
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify alias reset register register_once unregister get_distinct_id setPersonProperties group resetGroups onFeatureFlags getFeatureFlag isFeatureEnabled reloadFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init('phc_qPC4MNPJD9b49YGCfjJAKd23RRRQjkWaeXVySYXsCsnR', {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
  });

  // Event helper — main app `index.html`'deki `window.dpEvent` ile aynı kontrat,
  // tek fark: surface = 'landing'.
  window.dpEvent = function (name, properties) {
    try {
      if (!window.posthog) return;
      window.posthog.capture(name, Object.assign({
        platform: 'web',
        surface: 'landing',
        app_version: '1.0.0',
      }, properties || {}));
    } catch (_) {}
  };
})();
