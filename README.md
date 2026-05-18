# TizenViewer

Module [TizenBrew](https://github.com/notexactlyawe/tizenbrew) pour ouvrir **n’importe quelle page web** sur une Samsung TV, en pilotant l’URL depuis un **téléphone** sur le même réseau Wi‑Fi.

## Fonctionnement

1. Un **petit serveur HTTP** tourne sur votre PC (dossier `server/`), accessible sur le LAN (`0.0.0.0`).
2. Le `package.json` du module pointe vers l’URL de ce serveur (`websiteURL`), ici `http://192.168.1.41:9350` (à adapter si ton IP LAN change).
3. La **TV** ouvre cette page : le script injecté affiche un **iframe plein écran** et interroge `/api/state`.
4. Le **téléphone** ouvre `http://192.168.1.41:9350/phone.html`, saisit une URL et envoie `POST /api/navigate`.
5. La TV recharge l’iframe avec cette URL.

La **barre du bas** (Rafraîchir / Effacer) est pensée pour la **télécommande** : navigation spatiale comme dans TFlix (flèches + OK). La touche **Retour** efface la page et remet l’iframe vide (idem que « Effacer » côté téléphone).

## Limites importantes

- **Sites qui refusent l’iframe** (`X-Frame-Options`, CSP `frame-ancestors`) ne s’afficheront pas dans l’iframe ; dans ce cas il faudrait une autre stratégie (proxy, navigation plein onglet si TizenBrew le permet, etc.).
- Quand le **focus** est **dans** l’iframe (contenu du site), les flèches sont gérées par **le site** ; la barre du bas reste utilisable en naviguant avec les flèches depuis un bouton focalisé, ou après **Retour** puis focus sur les boutons.
- Les **touches média** pilotent une balise `video` **si** elle est dans un iframe **same-origin** (souvent rare) ; sinon le site gère tout seul la lecture.

## Installation module (après build)

1. Sur le PC : `build.bat` (ou `npm run build`), puis `local-test.bat` (ou `npm run local`). Le serveur écoute sur **9350**, sert la page TV, la télécommande web et les fichiers TizenBrew (`/package.json`, `/dist/…`).
2. Vérifie **`websiteURL`** dans `package.json` (LAN du PC qui lance le serveur, ex. `http://192.168.1.41:9350`). La TV ne peut pas utiliser `127.0.0.1` pour joindre ton PC.
3. Dans TizenBrew sur la TV, ajoutez la source : `http://192.168.1.41:9350/` (même base que `websiteURL`) puis installez le module (le dossier `dist/` doit exister après le build).

## Tester sur un navigateur (PC)

La page `/` **ne contient pas** le script du module : sur la TV, c’est **TizenBrew** qui injecte `dist/userScript.js`. Sur PC, pour voir le même comportement (iframe + requêtes `/api/state`), ouvrez :

- `http://192.168.1.41:9350/?bundle=1` (ou `http://127.0.0.1:9350/?bundle=1` depuis la même machine), ou  
- `http://192.168.1.41:9350/preview` (redirection vers `/?bundle=1`).

Sinon le 1er onglet reste vide et aucun appel réseau vers `/api/state` n’apparaît.

## Ports et pare-feu

- Port par défaut : **9350**. Variable d’environnement : `TIZENVIEWER_PORT`.
- Autoriser ce port entrant sur Windows si la TV ne joint pas le serveur.

## Licence

MIT (module et serveur). Le fichier `spatial-navigation-polyfill.js` reprend la logique de navigation spatiale sous licence MIT (voir en-tête du fichier).
