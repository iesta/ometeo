# ometeo

Météo minimale, mobile vertical, noir et violet — dans l'esprit d'Omarchy.

- zéro dépendance, trois fichiers (`index.html`, `styles.css`, `app.js`)
- données [Open-Meteo](https://open-meteo.com) (aucune clé, CORS ouvert)
- géolocalisation au premier lancement, sinon recherche de ville
- dernière météo en cache local + service worker → l'app s'ouvre hors ligne
- PWA installable (`manifest.webmanifest`)

## Palette

Reprise du thème Omarchy actif, `aether` :

| rôle | valeur |
|---|---|
| fond | `#00040C` |
| texte | `#F1DDFF` |
| accent | `#7774B6` / `#B597E9` |
| froid | `#8BC4FF` |

Typo : JetBrains Mono (repli Agave Nerd Font Mono, la mono du terminal).

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
