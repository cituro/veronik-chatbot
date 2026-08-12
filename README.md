# Chatbot pentru site (servicii/produse) cu memorie din documentatie + scanare site

Chatbot care raspunde vizitatorilor unui site despre serviciile/produsele oferite.
"Memoria" lui vine din doua surse, pe care le poti administra dintr-un panou web:

1. **Documentatie incarcata** (fisiere `.txt`, `.md`, `.csv`, `.pdf`, `.docx`)
2. **Continutul scanat automat de pe site-ul tau** (introduci un URL, iar botul parcurge paginile interne si extrage textul)

Raspunsurile sunt generate cu Claude (Anthropic), folosind doar informatiile relevante gasite in baza de cunostinte (tehnica RAG), ca sa nu "inventeze" preturi sau detalii.

## Structura proiectului

```
chatbot/
  backend/
    server.js          <- serverul Express
    routes/chat.js      <- endpoint public /api/chat
    routes/admin.js      <- endpointuri admin (upload, scanare, setari)
    lib/store.js         <- baza de cunostinte + cautare (TF-IDF, fara API extern)
    lib/scraper.js        <- scanare site (crawler intern)
    lib/docParser.js       <- extrage text din pdf/docx/txt
    lib/chat.js            <- construieste promptul si apeleaza Claude
    data/knowledge.json     <- baza de cunostinte salvata (creata automat)
    uploads/                <- fisiere temporare la upload (golit automat)
  public/
    widget.js            <- widget-ul de chat, de inclus pe orice site
    admin.html            <- panou de administrare (upload/scanare/setari)
    demo.html             <- pagina de test cu widget-ul integrat
  .env.example
  package.json
```

## Instalare

1. Instaleaza dependintele (ai nevoie de Node.js 18+; in `D:\CLAUDIU` ai deja `node.exe`/`npm.cmd`, dar poti folosi orice Node din sistem):

   ```bash
   cd chatbot
   npm install
   ```

2. Copiaza `.env.example` in `.env` si completeaza:

   ```bash
   cp .env.example .env
   ```

   - `ANTHROPIC_API_KEY` - cheia ta de la https://console.anthropic.com/ (obligatoriu, altfel chatul nu raspunde)
   - `ADMIN_PASSWORD` - parola pentru panoul de administrare - schimb-o cu una a ta
   - `ALLOWED_ORIGINS` - domeniile de pe care e voie sa ruleze widget-ul (`*` = toate, util in testare)

3. Porneste serverul:

   ```bash
   npm start
   ```

4. Deschide:
   - Panou administrare: http://localhost:3001/admin.html (autentificare cu `ADMIN_PASSWORD`)
   - Pagina demo: http://localhost:3001/demo.html

## Cum incarci "memoria" botului

In panoul de administrare:

1. **Setari afacere** - completezi numele afacerii, o descriere pe scurt a serviciilor/produselor, tonul dorit si mesajul de intampinare. Aceasta descriere e trimisa mereu botului, pe langa fragmentele relevante gasite in documente/site.
2. **Incarca documentatie** - urci fisiere cu detalii despre servicii, produse, preturi, intrebari frecvente etc.
3. **Scaneaza site-ul** - introduci URL-ul site-ului tau; botul parcurge paginile interne (acelasi domeniu), pana la limita de pagini/adancime setata, si extrage textul din ele.
4. **Surse** - vezi tot ce a fost incarcat/scanat, cu numarul de fragmente generate, si poti sterge o sursa sau toata baza.

Poti repeta pasii 2-3 oricand: re-incarcarea unui fisier cu acelasi nume sau re-scanarea aceleiasi pagini ii actualizeaza continutul in baza de cunostinte (nu creeaza duplicate).

## Cum adaugi widget-ul pe site-ul tau

In panoul de administrare, sectiunea 5 iti genereaza automat codul de inclus. In esenta:

```html
<script src="https://ADRESA-SERVERULUI-TAU/widget.js"
  data-api-url="https://ADRESA-SERVERULUI-TAU"
  data-name="Numele afacerii tale"
  data-greeting="Buna! Cu ce te pot ajuta astazi?"
  data-color="#2563eb"></script>
```

Pui acest cod chiar inainte de `</body>` in paginile site-ului tau (functioneaza pe orice site: HTML static, WordPress, Shopify, etc. - de obicei exista un loc pentru "cod personalizat / footer scripts"). Widget-ul apare ca o bula de chat in coltul din dreapta jos si comunica direct cu serverul tau prin `data-api-url`.

## Deploy (productie)

Daca ai un VPS cu cPanel/WHM (fara acces SSH), urmeaza ghidul dedicat din
[DEPLOY_CPANEL.md](DEPLOY_CPANEL.md) - foloseste modulul nativ "Setup Node.js App".

Pentru orice alt tip de hosting: serverul Node trebuie sa ruleze undeva accesibil pe internet (VPS, Render, Railway, un subdomeniu pe hostingul tau etc.), cu HTTPS. Pasii generali:

1. Urca folderul `chatbot/` pe server, ruleaza `npm install --production`.
2. Seteaza variabilele din `.env` direct pe server (nu urca `.env` in locuri publice).
3. Porneste serverul cu un process manager (ex: `pm2 start backend/server.js --name chatbot`) ca sa ramana activ.
4. Pune un domeniu/subdomeniu cu HTTPS in fata lui (ex: `chat.site-ul-tau.ro`) printr-un reverse proxy (Nginx/Caddy) sau direct prin platforma de hosting aleasa.
5. In `ALLOWED_ORIGINS`, pune domeniul exact al site-ului pe care rulezi widget-ul, in loc de `*`.
6. Actualizeaza `data-api-url` din codul de inclus cu adresa noua a serverului.

## Limitari cunoscute

- Cautarea in baza de cunostinte foloseste TF-IDF (potrivire pe cuvinte-cheie), nu embeddings semantice - functioneaza bine pentru intrebari care contin cuvintele din documentatie, dar nu intelege sinonime complexe. Daca vrei cautare semantica mai avansata, se poate inlocui `backend/lib/store.js` cu un API de embeddings (ex: Voyage AI, recomandat de Anthropic).
- Scanarea site-ului citeste doar HTML static randat de server; pagini care isi incarca continutul exclusiv prin JavaScript (SPA) pot sa nu fie extrase corect.
- Istoricul conversatiei e pastrat in memoria serverului (nu intr-o baza de date) - daca repornesti serverul, conversatiile in desfasurare se pierd (baza de cunostinte insa e salvata pe disc si ramane).
