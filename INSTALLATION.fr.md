# Installation

[English version](INSTALLATION.md)

## Avant de commencer

Il vous faut :
- Foundry VTT (v13 minimum, testé sur v14) ;
- le système de jeu `demonlord` (« Shadow of the Demon Lord ») installé ;
- un accès MJ pour activer le module.

## Installer

### Option A — URL du manifeste (recommandé)

1. Sur l'écran d'accueil de Foundry, onglet **Modules**, cliquez sur **Installer un module**.
2. Collez cette URL dans le champ **URL du manifeste**, en bas de la fenêtre :
   ```
   https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
   ```
3. Cliquez sur **Installer**.

Avec cette méthode, Foundry propose les mises à jour automatiquement.

### Option B — Installation manuelle

Repérez votre dossier `Data` :
- **Windows** : `C:\Users\[VotreNom]\AppData\Local\FoundryVTT\Data`
- **macOS** : `~/Library/Application Support/FoundryVTT/Data`
- **Linux** : `~/.foundryvtt/Data`

Créez un dossier `sodl-trade` dans `Data/modules/` et copiez-y tous les fichiers du module (`module.json` doit être à la racine de ce dossier).

## Activer dans le monde

1. Lancez un monde qui utilise le système `demonlord`.
2. **Paramètres → Gérer les modules**.
3. Cochez **« L'Ombre du Seigneur Démon - Échanges »**, puis enregistrez.

> Le module n'apparaît dans cette liste que si le monde utilise une version compatible du système `demonlord` (voir `module.json` → `relationships.systems`).

Une fois le monde rechargé, la barre d'outils de gauche contient l'icône **à double flèche** qui ouvre la fenêtre Échanges, pour le MJ comme pour les joueurs.

## Avant la première séance

- **Attribuez à chaque joueur son personnage** (*Configuration de l'utilisateur → Personnage*), ou donnez-lui la permission **Propriétaire** dessus. Seuls ces personnages apparaissent dans les échanges, les partages et les achats.
- **Préparez les boutiques** dans l'onglet **Achats** (bouton **Modifier les boutiques**) : créez des catégories et remplissez-les à partir de dossiers d'objets.
- **Vérifiez l'unité des prix sans unité** dans les paramètres : le système `demonlord` stocke ses prix en couronnes d'or.

## Paramètres

Dans **Paramètres → Configurer les paramètres → L'Ombre du Seigneur Démon - Échanges** :

| Paramètre | Par défaut | Qui |
|---|---|---|
| Annoncer les récompenses dans le chat | activé | MJ |
| Annoncer les achats dans le chat | activé | MJ |
| Unité des prix sans unité | CO | MJ |

La langue du module suit celle de Foundry (**Paramètres principaux → Langue**) : français ou anglais.

## Mettre à jour

**Installé par l'URL du manifeste** — Onglet **Modules**, bouton **Mettre à jour** à côté du module.

**Installé manuellement** — Supprimez `Data/modules/sodl-trade/`, copiez la nouvelle version, puis rechargez le monde (Ctrl+Maj+R pour vider le cache des scripts).

Les données sont conservées dans le monde d'une mise à jour à l'autre : échanges en cours, récompenses et boutiques.

## Désinstaller

1. **Gérer les modules** : décochez le module et enregistrez.
2. Supprimez le dossier `sodl-trade`.

## Dépannage

**Le module n'apparaît pas dans « Gérer les modules »**
- Le dossier est-il dans `Data/modules/`, avec `module.json` à sa racine ?
- Le monde utilise-t-il le système `demonlord` (c'est l'identifiant qui compte, pas le nom affiché), dans une version assez récente ?

**L'icône à double flèche n'apparaît pas dans la barre d'outils de gauche**
- Rafraîchissez (F5, ou Ctrl+Maj+R).
- Ouvrez la console (F12) pour repérer une erreur de chargement.

**« Un MJ doit être connecté pour gérer les échanges »**
- Les transferts sont faits par le client du MJ : un utilisateur avec le rôle **Maître de jeu** doit être connecté.

**Un personnage manque dans la liste, ou un personnage inattendu apparaît**
- Un personnage compte s'il est attribué à un joueur, ou si un joueur a nommément la permission **Propriétaire** dessus. Une permission donnée à tout le monde par défaut ne compte pas.

**Un prix de boutique semble faux**
- Si le prix de l'objet est un simple nombre (« 5 », « 0.5 »), vérifiez le paramètre **Unité des prix sans unité**. Les prix sont lus à l'import : après avoir changé le paramètre, retirez les objets et réimportez-les, ou corrigez le prix à la main dans **Modifier les boutiques**.
