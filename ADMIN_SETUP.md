# Admin créateur

Le bouton `⚙ Admin` utilise le code `luluadmin` côté Worker, pas dans le JavaScript public.

## 1. Secret Admin

Dans le Worker `compresseur-luluclc3-vip`, crée le secret :

- Nom : `ADMIN_CODE`
- Valeur : `luluadmin`

Ajoute aussi un secret `ADMIN_SECRET` avec une longue valeur aléatoire.

## 2. Stockage des statistiques

Le tableau de bord utilise une liaison Workers KV nommée `ANALYTICS_KV`. Il faut créer un namespace KV puis le lier au Worker sous ce nom. Cloudflare documente les liaisons KV dans sa documentation officielle.

## 3. Déploiement

Après le déploiement du Worker et du site Pages, le bouton `⚙ Admin` apparaît à côté de `✦ VIP`.

Les statistiques conservées sont notamment : visites, sessions, opérations, durée de session, tailles avant/après, économie, profil utilisé, navigateur/agent utilisateur, langue, fuseau horaire, résolution d'écran, pays approximatif et centre Cloudflare.

Le contenu des fichiers, les mots de passe et les IP brutes ne sont pas enregistrés.

Les événements Analytics sont automatiquement expirés après 30 jours.
