# Mettre ProServices en ligne (Render + MongoDB Atlas)

Ce guide met le site en ligne gratuitement, en trois parties :

| Élément | Hébergeur | Offre |
|---|---|---|
| Base de données (+ photos et documents envoyés) | MongoDB Atlas | M0 gratuite (512 Mo) |
| API (FastAPI) | Render, service web `proservices-api` | Free |
| Site (React) | Render, site statique `proservices-web` | Free |

Comptez environ 30 minutes la première fois. Les adresses données en exemple
(`proservices-api.onrender.com`, `proservices-web.onrender.com`) peuvent être différentes
chez vous si ces noms sont déjà pris sur Render : utilisez celles que Render vous affiche.

---

## 1. Créer la base MongoDB Atlas

1. Créez un compte sur https://www.mongodb.com/cloud/atlas/register.
2. **Create** → choisissez **M0 (Free)**, fournisseur au choix, région **Europe (Paris ou Francfort)**.
3. **Database Access** → **Add New Database User** :
   - méthode *Password*, nom par exemple `proservices` ;
   - cliquez sur **Autogenerate Secure Password** et **copiez le mot de passe** ;
   - rôle : *Read and write to any database*.
4. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
   Render n'a pas d'adresse IP fixe sur l'offre gratuite : c'est nécessaire. La base reste
   protégée par l'utilisateur et le mot de passe.
5. **Database** → **Connect** → **Drivers** → copiez la chaîne de connexion, de la forme :

   ```
   mongodb+srv://proservices:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

   Remplacez `<password>` par le mot de passe copié à l'étape 3. Si le mot de passe contient
   des caractères spéciaux (`@ : / ? # %`), encodez-les (par exemple `@` devient `%40`).

Gardez cette chaîne : c'est la variable **`MONGO_URI`**. Ne la publiez jamais (ni sur GitHub, ni dans un message).

---

## 2. Mettre le code sur GitHub

Render déploie depuis un dépôt Git. Depuis le dossier du projet :

```bash
cd "/home/hodi/Bureau/projet soutenance/fonkou"
git init
git add .
git status          # vérifiez qu'il n'y a NI backend/.env, NI backend/venv, NI node_modules, NI backend/uploads
git commit -m "ProServices : version prête pour Render"
git branch -M main
git remote add origin https://github.com/<votre-compte>/proservices.git
git push -u origin main
```

Créez d'abord le dépôt vide `proservices` sur https://github.com/new (il peut être privé).
Le fichier `.gitignore` exclut déjà les secrets (`.env`), l'environnement Python, `node_modules`
et les pièces justificatives déposées en local.

---

## 3. Créer les deux services sur Render

1. Créez un compte sur https://render.com (connexion avec GitHub conseillée).
2. **New** → **Blueprint** → choisissez le dépôt `proservices`.
   Render lit le fichier `render.yaml` et propose de créer `proservices-api` et `proservices-web`.
3. Render demande les variables marquées « à renseigner ». Remplissez :

   | Variable | Service | Valeur |
   |---|---|---|
   | `MONGO_URI` | proservices-api | la chaîne Atlas de l'étape 1 |
   | `ALLOWED_ORIGINS` | proservices-api | `https://proservices-web.onrender.com` |
   | `FRONTEND_URL` | proservices-api | `https://proservices-web.onrender.com` |
   | `PUBLIC_API_URL` | proservices-api | `https://proservices-api.onrender.com` |
   | `SMTP_USER`, `SMTP_PASSWORD` | proservices-api | laisser vide (emails désactivés), ou un compte SMTP |
   | `VITE_API_URL` | proservices-web | `https://proservices-api.onrender.com` |

   Les autres variables sont déjà réglées : `SECRET_KEY` est générée automatiquement,
   `DEBUG=false`, `PYTHON_VERSION=3.11.9`, `NODE_VERSION=20`.
4. Cliquez sur **Apply**. Le premier déploiement prend 5 à 10 minutes.

**Si Render a donné d'autres adresses** que celles ci-dessus (nom déjà pris) : ouvrez chaque
service, notez son adresse réelle, corrigez les variables dans **Environment**, puis :
- pour l'API : **Save Changes** (redémarrage automatique) ;
- pour le site : **Manual Deploy → Clear build cache & deploy** (l'adresse de l'API est
  intégrée au moment de la construction du site).

---

## 4. Créer le compte administrateur

Le premier Super Admin se crée depuis votre ordinateur, directement dans la base Atlas
(l'offre gratuite de Render ne donne pas accès au terminal du serveur) :

```bash
cd "/home/hodi/Bureau/projet soutenance/fonkou/backend"
MONGO_URI="mongodb+srv://...votre chaîne Atlas..." \
DEBUG=true \
PYTHONPATH=~/.cache/proservices-dev/pylib \
python3 create_admin.py admin@votredomaine.fr "MotDePasseSolide1" Prénom Nom
```

`DEBUG=true` sert seulement à lancer ce script sans `SECRET_KEY` ; il n'a aucun effet sur le site en ligne.
Les administrateurs suivants s'ajoutent ensuite depuis le site (Administration → Équipe).

---

## 5. Vérifier

- `https://proservices-api.onrender.com/api/health` → `{"status":"healthy",...}`
- `https://proservices-web.onrender.com` → la page d'accueil, avec les 75 métiers
  (ils sont créés automatiquement au premier démarrage de l'API).
- Créez un compte, envoyez une photo de profil : elle doit rester affichée après un redéploiement
  (les fichiers sont stockés dans MongoDB, pas sur le disque de Render).

---

## (Facultatif) Reprendre les données locales

Pour copier vos comptes, missions, etc. de la base locale vers Atlas
(outils `mongodump` / `mongorestore` : paquet *MongoDB Database Tools*) :

```bash
mongodump --uri="mongodb://localhost:27017/proservices" --out=/tmp/sauvegarde-proservices
mongorestore --uri="mongodb+srv://...votre chaîne Atlas..." --nsInclude="proservices.*" /tmp/sauvegarde-proservices
```

Puis, pour envoyer aussi les photos et documents encore présents dans `backend/uploads/` :

```bash
cd "/home/hodi/Bureau/projet soutenance/fonkou/backend"
MONGO_URI="mongodb+srv://...votre chaîne Atlas..." DEBUG=true \
PYTHONPATH=~/.cache/proservices-dev/pylib python3 migrate_uploads_to_gridfs.py
```

Le script peut être relancé sans risque : les fichiers déjà copiés sont ignorés.

---

## Bon à savoir

- **Mise en veille (offre gratuite)** : l'API s'endort après 15 minutes sans visite. La visite
  suivante attend 30 à 60 secondes le temps du réveil. Avant une démonstration (soutenance),
  ouvrez `…/api/health` une minute à l'avance. L'offre *Starter* de Render (payante) supprime la veille.
- **Paiements** : `PAYMENT_SIMULATION=true` simule les paiements (carte, MTN, Orange) pour la
  démonstration ; aucun argent réel ne circule et aucun retrait n'est possible. Pour encaisser
  réellement, il faudra brancher de vraies passerelles (clés MTN MoMo / Orange Money, ou Stripe pour
  la carte), puis passer `PAYMENT_SIMULATION` à `false`.
- **Stockage** : la base gratuite Atlas fait 512 Mo, partagés entre les données et les fichiers
  envoyés (10 Mo maximum par fichier). Largement suffisant pour une démonstration.
- **Mises à jour** : chaque `git push` sur `main` redéploie automatiquement les deux services.
- **Mot de passe Atlas compromis ?** Changez-le dans Atlas (Database Access), puis mettez à jour
  `MONGO_URI` dans Render.
