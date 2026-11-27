# ometeo

Météo minimale, mobile vertical — six thèmes repris d'Omarchy.

- zéro dépendance, trois fichiers (`index.html`, `styles.css`, `app.js`)
- données [Open-Meteo](https://open-meteo.com) (aucune clé, CORS ouvert)
- géolocalisation au premier lancement, sinon recherche de ville
- dernière météo en cache local + service worker → l'app s'ouvre hors ligne
- PWA installable : manifeste, icônes maskables, métadonnées Open Graph

## Thèmes

Le bouton ◐ de la barre ouvre le sélecteur ; le choix est gardé dans
`localStorage` (`ometeo.theme`) et appliqué avant le premier rendu, sans flash.

| id | nom | couleur |
|---|---|---|
| `aether` | Aether | violet, thème actif d'Omarchy (défaut) |
| `lumon` | Lumon | bleu glacé |
| `black-sand` | Black Sand | acier neutre |
| `tokyorain` | Tokyo Rain | noir profond, cyan |
| `forest` | Forest Night | vert menthe |
| `dusk` | Dusk | sable et bleu |

Chaque thème ne définit que onze couleurs ; le reste (filets, halos, fonds,
transparences) est dérivé en `color-mix()`. Pour en ajouter un :

1. copier un bloc `[data-theme="…"]` dans `styles.css` avec les couleurs du
   `colors.toml` du thème Omarchy voulu ;
2. ajouter une entrée dans `THEMES` (`app.js`) pour le sélecteur.

## Typo

JetBrains Mono (repli Agave Nerd Font Mono, la mono du terminal) et
Space Grotesk pour le grand chiffre. Le visuel de partage `og.png` est rendu
depuis `tools/og.html`.

## Hébergement local

Le dossier est servi tel quel, sans build, par un service systemd utilisateur
(`~/.config/systemd/user/ometeo.service`, port **8801**, démarré au boot) :

| depuis | adresse |
|---|---|
| cette machine | http://localhost:8801 |
| le Wi-Fi de la maison | http://192.168.50.220:8801 |
| le tailnet (HTTPS, géoloc OK) | https://oma.tailfb51b4.ts.net:8443 |

```sh
systemctl --user status ometeo     # état
systemctl --user restart ometeo    # après une modif (les fichiers sont servis en direct)
tailscale serve --https=8443 off   # retire l'accès tailnet
```

L'HTTPS passe par `tailscale serve` (entrée séparée sur le port 8443 ; le 443
du tailnet reste occupé par Collie). Sur `http://` hors localhost, le navigateur
bloque la géolocalisation : l'app retombe sur Bruxelles, ou sur la ville cherchée.

Pour un simple essai sans service :

```sh
python3 -m http.server 8080
```

`file://` fonctionne aussi, sauf le service worker et la géolocalisation.

## Publier

Le dossier tel quel suffit (statique, aucune étape de build).

`og:url`, `og:image` et le `canonical` pointent sur
`https://oma.tailfb51b4.ts.net:8443/` : à changer dans `index.html` si l'app
déménage, sinon l'aperçu de partage pointera vers l'ancienne adresse.
