// Locul unde se salveaza fisierele locale (baza de cunostinte, cereri, consum).
// Implicit e un folder relativ langa cod - functioneaza local, dar pe Render,
// fara disc persistent atasat, se pierde la fiecare redeploy/repornire.
// Daca ai atasat un disc persistent Render, seteaza DATA_DIR la calea unde
// l-ai montat (ex: /var/data/veronik) si datele vor supravietui repornirilor.
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");

module.exports = DATA_DIR;
