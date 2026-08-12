# Publicare pe veronik.ro printr-un VPS cu cPanel/WHM (fara SSH)

Acest ghid presupune ca ai deja cPanel activ pe VPS-ul unde e gazduit veronik.ro
si ca vrei sa pui chatbot-ul pe un subdomeniu, ex: `chat.veronik.ro`.
cPanel are un modul nativ pentru aplicatii Node.js ("Setup Node.js App", bazat
pe Phusion Passenger) - il folosim, nu ai nevoie de acces SSH.

## Pasul 1 - Creezi subdomeniul

1. In cPanel, mergi la **Domains** (sau **Subdomains**, in functie de versiune).
2. Creeaza subdomeniul `chat.veronik.ro`.
3. Ca "Document Root", poti lasa valoarea implicita propusa de cPanel
   (ex: `chat.veronik.ro` sau `public_html/chat`) - modulul Node.js isi
   gestioneaza singur folderul de aplicatie, document root-ul e folosit doar
   pentru fisiere statice, nu conteaza foarte mult aici.
4. Asteapta cateva minute si verifica in **SSL/TLS Status** ca AutoSSL a emis
   deja un certificat gratuit pentru `chat.veronik.ro` (de obicei automat).

## Pasul 2 - Urci fisierele proiectului

Cel mai simplu, fara SSH:

1. Pe acest calculator, arhiveaza tot folderul `chatbot` (fara `node_modules`)
   intr-un ZIP.
2. In cPanel, deschide **File Manager**, navigheaza intr-un folder dedicat,
   de exemplu `chatbot_app` (in afara lui `public_html`, e mai sigur - nu
   trebuie sa fie accesibil direct din web, Passenger il serveste el).
3. Urca ZIP-ul si dezarhiveaza-l acolo (click dreapta -> Extract).

Alternativ, daca ai instalat modulul **Git Version Control** in cPanel, poti
urca proiectul intr-un repo Git (GitHub/GitLab privat) si il clonezi direct
din cPanel, ceea ce face actualizarile ulterioare mult mai usoare.

## Pasul 3 - Configurezi aplicatia Node.js

1. In cPanel, deschide **Setup Node.js App**.
2. Click **Create Application**:
   - **Node.js version**: alege cea mai recenta disponibila (18 sau mai nou)
   - **Application mode**: `Production`
   - **Application root**: folderul unde ai dezarhivat proiectul (ex: `chatbot_app`)
   - **Application URL**: `chat.veronik.ro`
   - **Application startup file**: `backend/server.js`
3. Salveaza. cPanel iti va afisa o comanda de tipul
   `source /home/USER/nodevenv/chatbot_app/18/bin/activate && cd ...` -
   nu ai nevoie de ea daca nu ai SSH, ignor-o.
4. In aceeasi pagina de configurare a aplicatiei, la sectiunea
   **Environment Variables**, adauga:
   - `ANTHROPIC_API_KEY` = cheia ta reala de la console.anthropic.com
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-5`
   - `ADMIN_PASSWORD` = o parola puternica, aleasa de tine
   - `ALLOWED_ORIGINS` = `https://veronik.ro,https://www.veronik.ro`

   Nu mai e nevoie de `PORT` - Passenger il seteaza singur, iar serverul
   nostru il citeste automat din `process.env.PORT`.

5. Click **Run NPM Install** (buton disponibil direct in pagina aplicatiei).
   Asteapta sa se termine (poate dura 1-2 minute).
6. Click **Restart** (sau **Start**, daca e prima pornire).

## Pasul 4 - Verifici ca merge

Deschide in browser:
- `https://chat.veronik.ro/api/health` - ar trebui sa vezi `{"ok":true,"hasApiKey":true}`
- `https://chat.veronik.ro/admin.html` - te loghezi cu `ADMIN_PASSWORD` si
  completezi datele afacerii, incarci documentatie, scanezi `https://veronik.ro`

## Pasul 5 - Pui widget-ul pe veronik.ro (WordPress)

1. In WordPress, instaleaza un plugin gratuit de tip
   **"Insert Headers and Footers"** (sau **WPCode**, foarte popular si el).
2. In setarile pluginului, la sectiunea **Footer**, lipesti:

   ```html
   <script src="https://chat.veronik.ro/widget.js"
     data-api-url="https://chat.veronik.ro"
     data-name="Veronik"
     data-greeting="Buna! Cu ce te pot ajuta astazi?"
     data-color="#2563eb"></script>
   ```

   (Codul exact, cu numele si mesajul tale, il gasesti si generat automat in
   panoul de administrare al chatbot-ului, sectiunea 5.)

3. Salveaza. Widget-ul (bula de chat) va aparea pe toate paginile din
   veronik.ro, in coltul din dreapta jos.

## Siguranta - ce sa nu uiti

- **Nu pune niciodata `chatbot_app` (folderul cu `.env`) direct in
  `public_html`** - foloseste un folder separat, asa cum e descris la Pasul 2,
  ca `.env`-ul (cu cheia API si parola admin) sa nu fie accesibil public prin URL.
- Foloseste o parola puternica si unica pentru `ADMIN_PASSWORD` - oricine o
  afla poate incarca/sterge continut din baza de cunostinte a botului.
- Seteaza `ALLOWED_ORIGINS` la domeniul tau exact (nu la `*`) odata ce esti
  in productie, ca sa nu poata fi apelat API-ul de pe alte site-uri.
- Daca la un moment dat capeti acces SSH, poti gestiona aplicatia si cu
  `pm2` sau direct din linia de comanda, dar modulul cPanel de mai sus
  functioneaza identic si fara SSH.

## Actualizari ulterioare

Cand modifici codul (ex: adaugi un logo nou pentru widget, schimbi textul):
1. Repeti Pasul 2 (urci fisierele noi peste cele vechi in File Manager, sau
   `git pull` daca ai configurat Git Version Control).
2. Din **Setup Node.js App**, click **Restart** pe aplicatie.
