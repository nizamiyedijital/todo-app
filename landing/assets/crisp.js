/* Disiplan Crisp chat widget — landing pages.
 * Web main app (index.html) ayrı snippet'le yükler + user identify yapar.
 * Faz 4.B.2'de webhook ile Crisp → support_tickets ingestion eklenecek.
 */
(function () {
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = '207f8235-63fa-424e-a7c4-37677d901e5f';
  var d = document;
  var s = d.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = 1;
  d.getElementsByTagName('head')[0].appendChild(s);
})();
