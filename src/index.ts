import { postgres } from './postgres';
import { https } from './https';
import wsTransport from './util/wsTransport';

const urlStr = location.hash.slice(1);
const pg = urlStr && urlStr.startsWith('postgres');
const web = urlStr && urlStr.startsWith('https');
const goBtn = document.getElementById('go')! as HTMLButtonElement;
const heading = document.getElementById('heading')! as HTMLHeadingElement;

if (pg) {
  goBtn.value = 'Ask Postgres the time over TLS';
  heading.textContent = 'Postgres + TLS, byte-by-byte, LIVE!';
}

goBtn.addEventListener('click', () => {
  document.querySelector('#logs')?.replaceChildren();  // clear logs
  if (pg) void postgres(urlStr, wsTransport, false);
  else void https(web ? urlStr : 'https://bytebybyte.dev', 'GET', wsTransport);
});
