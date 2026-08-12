# Cum onboardezi un client nou (instanță izolată)

Fiecare client plătitor primește propria instanță Render, complet separată de
a celorlalți — propria bază de cunoștințe, propriul panou de admin, propria
parolă. Clientul își personalizează singur chatbot-ul, tu doar creezi instanța
inițial.

Timp estimat: **~5-10 minute** per client.

## Pasul 1 — creezi serviciul pe Render

Foloseste codul deja existent din `github.com/cituro/veronik-chatbot` (același
cod pentru toți clienții — ce diferă e doar datele si configurarea, stocate
separat per instanță).

Din Render Dashboard (sau prin mine, dacă ești în sesiune cu Claude Code):

- **New → Web Service** → conectezi repo-ul `cituro/veronik-chatbot`, branch `main`
- **Name**: un nume unic, ex. `veronik-<numeclient>` (devine parte din URL:
  `<nume>.onrender.com`)
- **Region**: Frankfurt (cel mai apropiat de România)
- **Build Command**: `npm install`
- **Start Command**: `node backend/server.js`
- **Plan**: `Starter` (nu `Free`) — planul gratuit are stocare efemeră, se
  poate pierde documentația/conversațiile clientului la un redeploy sau
  repornire. Pentru un client plătitor, Starter e minimul recomandat.

## Pasul 2 — variabile de mediu

| Variabilă | Valoare |
|---|---|
| `ANTHROPIC_API_KEY` | aceeași cheie folosită și pentru celelalte instanțe |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` |
| `ADMIN_PASSWORD` | **parolă nouă, unică**, generată pentru acest client — nu o refolosi de la altul |
| `ALLOWED_ORIGINS` | domeniul real al site-ului clientului, ex. `https://site-client.ro,https://www.site-client.ro` |

## Pasul 3 — (opțional) domeniu propriu

Dacă vrei ca link-ul să arate a brand Veronik (nu `xxx.onrender.com`):
- Render → serviciul → Settings → Custom Domains → adaugi un subdomeniu, ex.
  `client1.veronik.ro`
- La DNS-ul `veronik.ro`, adaugi CNAME: `client1` → `<nume-serviciu>.onrender.com`
- Așteaptă verificarea + certificatul SSL (câteva minute, uneori până la ~30-60 min)

## Pasul 4 — predai accesul clientului

Îi trimiți clientului:
1. Link-ul panoului de admin: `https://<instanta-lui>/admin.html`
2. Parola de admin generată pentru el
3. Un scurt ghid (poți reutiliza secțiunea "Cum încarci memoria botului" din
   [README.md](README.md)) — încarcă documentație / scanează site-ul, își
   personalizează numele, tonul, culorile, logo-ul
4. Codul de instalare (`<script src=...>`) — clientul îl generează singur din
   panoul lui de admin, secțiunea 5, sau i-l dai tu direct

De aici încolo, clientul e complet independent — nu mai are nevoie de tine
pentru a-și actualiza conținutul botului.

## Ce rămâne responsabilitatea ta

- Facturarea (momentan manuală — nu există procesare automată de plăți conectată)
- Suport tehnic dacă ceva nu merge
- Renunțarea/oprirea instanței dacă clientul anulează abonamentul (Render →
  serviciul → Settings → Delete Web Service)

## Instanță demo — exemplu viu

Am creat o instanță de test ca să vezi exact ce primește un client:

- Panou admin: **https://veronik-demo-client.onrender.com/admin.html**
- Parolă: vezi mesajul din conversație (nu o salvăm în acest fișier)

Testeaz-o, apoi șterge-o din Render Dashboard când ai terminat (Settings →
Delete Web Service), ca să nu ocupe loc degeaba.
