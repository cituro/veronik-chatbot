# Publicare pe Render.com (fara Node.js pe hostingul propriu)

Acest ghid documenteaza deployment-ul chatbot-ului Veronik pe Render.com, folosit
ca alternativa la un VPS/cPanel care nu are Node.js disponibil.

## Ce s-a facut deja

1. Cod sursa urcat pe GitHub: https://github.com/cituro/veronik-chatbot
2. Serviciu Node creat pe Render (workspace "CÎTU's workspace"), din acest repo,
   ramura `main`, regiune Frankfurt (cea mai apropiata de Romania)
3. Variabile de mediu setate: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
   `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`
4. Deploy automat activat: orice `git push` pe `main` redeployeaza automat

URL implicit generat de Render: **https://veronik-chatbot.onrender.com**

## Pasul urmator - domeniu propriu (chat.veronik.ro)

Ca vizitatorii sa vada `chat.veronik.ro` in loc de `veronik-chatbot.onrender.com`:

1. In Render Dashboard, deschide serviciul `veronik-chatbot` → **Settings** →
   **Custom Domains** → **Add Custom Domain** → scrie `chat.veronik.ro`
2. Render iti va afisa o valoare CNAME (ceva de forma
   `veronik-chatbot.onrender.com`)
3. La providerul tau de DNS (acolo unde ai domeniul veronik.ro), adaugi o
   inregistrare:
   ```
   Tip:   CNAME
   Nume:  chat
   Valoare: veronik-chatbot.onrender.com
   ```
4. Asteptare propagare DNS: de obicei sub o ora. Render emite automat
   certificat SSL (Let's Encrypt) pentru domeniul nou, odata ce DNS-ul e activ.

Codul din `index.html` si `politici.html` foloseste deja `https://chat.veronik.ro`
pentru formularul de cereri si pentru widget - nu trebuie schimbat nimic acolo
odata ce domeniul e configurat.

## Actualizari ulterioare

Nu mai e nevoie de upload manual de fisiere. Orice modificare de cod se face
astfel:

```bash
git add -A
git commit -m "descrie modificarea"
git push
```

Render detecteaza automat push-ul si redeployeaza (auto-deploy e activat).
Poti urmari progresul in Render Dashboard → serviciul → tab **Events** sau **Logs**.

## Plan gratuit - limitari de stiut

Planul `free` de pe Render "adoarme" serviciul dupa ~15 minute de inactivitate;
prima cerere dupa o perioada de inactivitate poate dura 30-60 secunde
(serviciul "se trezeste"). Pentru un site de productie cu trafic constant,
recomandam trecerea la planul `starter` (~7 $/luna) din Render Dashboard →
serviciul → **Settings** → **Instance Type**, ca sa ramana mereu activ.

## Verificare rapida

- `https://chat.veronik.ro/api/health` → ar trebui sa arate `{"ok":true,"hasApiKey":true}`
- `https://chat.veronik.ro/admin.html` → panoul de administrare (parola din Render → Environment)
