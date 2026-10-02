# L'Ombre du Seigneur Démon - Échanges

[English version](README.md)

Module Foundry VTT pour **L'Ombre du Seigneur Démon** : échanges négociés entre joueurs et approuvés par le MJ, butin commun dévoilé au fil de la partie, et boutiques avec prix, disponibilité et stock.

**Compatibilité :** Foundry VTT v13+ (testé sur v14) | Système `demonlord` v6.1.0+

**Langues :** français et anglais, selon la langue choisie dans Foundry (*Paramètres → Configurer les paramètres → Paramètres principaux → Langue*).

## Ce qu'il y a dedans

Tout passe par la fenêtre **Échanges**, ouverte par le bouton à double flèche de la barre d'outils de gauche. Elle a trois onglets : **Échanges**, **Récompenses** et **Achats**. Sous les onglets, un bandeau montre le personnage du joueur (portrait, nom, bourse). Un joueur qui possède plusieurs personnages y choisit celui avec lequel il agit.

Un compteur sur le bouton de la barre d'outils, et sur chaque onglet, signale ce qui attend : échanges et demandes d'achat à valider pour le MJ ; échanges en cours et trésors à prendre pour les joueurs.

### Échanges entre joueurs
- **Proposer** — Dans l'onglet Échanges, le joueur clique sur le portrait d'un autre personnage. La fenêtre de négociation s'ouvre chez les deux joueurs.
- **Négocier** — Chacun voit son inventaire à droite, rangé comme sur sa fiche (**Combat** et **Inventaire**). Il glisse les objets dans sa colonne, ou clique dessus pour en ajouter un. Les objets peuvent aussi être glissés depuis la fiche du personnage. La quantité se règle dans l'offre, et l'argent se saisit pièce par pièce, avec ce que le personnage possède indiqué à côté.
- **Valider** — Chacun clique **Valider l'échange**. Toute modification d'une offre annule les deux validations.
- **Approbation du MJ** — Le MJ est prévenu par le compteur et par un message dans le chat, ouvre l'échange, puis l'approuve ou le refuse. À l'approbation, les objets et l'argent changent de main. Un objet reçu arrive déséquipé.
- **Suivi** — Chaque étape est notée dans le chat, par défaut en message privé au MJ et aux deux joueurs (voir les paramètres). Le MJ voit tous les échanges en cours dans l'onglet Échanges.

### Récompenses (butin commun)
- **Fermé par défaut** — L'onglet est grisé pour les joueurs. Le MJ prépare le butin, puis clique **Ouvrir aux joueurs**. **Fermer aux joueurs** le referme à tout moment.
- **Accès** — Par défaut, les récompenses s'adressent à **tout le groupe**. Le MJ peut les réserver à certains personnages en les sélectionnant : les autres voient l'onglet fermé, et les messages du chat ne partent qu'au MJ et aux joueurs concernés.
- **Préparer** — Le bouton **Préparer** passe en édition : le MJ glisse ce que le groupe a trouvé (barre latérale, compendium, fiche d'un PNJ), règle les quantités et saisit l'argent. **Terminer** revient à la vue de jeu. L'objet déposé est une copie : l'original reste où il était.
- **Dévoiler au fur et à mesure** — Tout ce que le MJ dépose est caché. En vue de jeu, il dévoile chaque trésor d'un clic sur l'œil, l'argent à part, ou tout d'un coup avec **Tout dévoiler**. Les joueurs ne voient et ne peuvent prendre que ce qui est dévoilé.
- **Se servir** — Les joueurs prennent directement ce qu'ils veulent, à l'unité, ainsi que l'argent.
- **Partager l'argent** — Le MJ sélectionne les personnages concernés (tous par défaut) et partage l'argent à parts égales. La monnaie est faite automatiquement (1 CO = 10 CA = 100 SC = 1000 éclats), et ce qui ne se divise pas reste dans le butin.

### Achats (boutiques)
- **Catégories** — Les boutiques sont rangées en catégories (Forgeron, Alchimiste…), repliables d'un clic sur leur en-tête.
- **Ouvrir ou fermer** — Une nouvelle boutique est fermée : le MJ la prépare, puis l'ouvre aux joueurs avec le cadenas de son en-tête. Les joueurs ne voient et ne peuvent acheter que dans les boutiques ouvertes ; s'il n'y en a aucune, l'onglet Achats est grisé. Ils sont prévenus quand une boutique ouvre.
- **Remplir** — Le bouton **Modifier les boutiques** passe en édition. Le MJ remplit une catégorie en collant l'ID ou l'UUID d'un dossier d'objets puis en cliquant **Importer**, en glissant un dossier entier sur la catégorie, ou en y glissant des objets un par un. Les sous-dossiers sont inclus, et les dossiers de compendium fonctionnent aussi.
- **Prix et disponibilité** — Chaque objet reprend son nom, son prix et sa disponibilité (commun, inhabituel, rare, exotique), que le MJ peut modifier. Un prix s'écrit par exemple « 1 CO 5 CA ». Un nombre seul, comme « 5 » ou « 0.5 », est compté dans l'unité choisie dans les paramètres (CO par défaut, comme le système), et les décimales sont converties en pièces : 0.5 CO devient 5 CA. Un objet sans prix lisible affiche « Prix à fixer » et ne peut pas être acheté.
- **Stock** — Illimité par défaut. Le MJ saisit le nombre de lots disponibles (champ vide = illimité). Chaque achat retire les lots achetés ; à 0, l'objet est « Épuisé ». Le bouton **Réapprovisionner** (toutes les boutiques, ou une catégorie depuis son en-tête) remet chaque objet au stock saisi par le MJ.
- **Acheter** — Par défaut, le joueur envoie une **demande d'achat** : rien n'est débité tant que le MJ ne l'a pas validée. Le MJ voit les demandes en haut de l'onglet (avec la bourse de l'acheteur) et un compteur sur l'onglet. Il peut y modifier la quantité (le prix suit en proportion) et le prix total, jusqu'à 0 pour offrir l'objet, puis valide ou refuse ; le joueur est prévenu de chaque modification et peut annuler sa demande tant qu'elle est en attente. À la validation, le prix demandé est débité, le marchand rend la monnaie et le stock baisse. Si le MJ désactive la validation dans les paramètres, l'achat est immédiat. Un objet vendu en lot (20 flèches, par exemple) est livré entier pour le prix du lot.

## Installation

Voir le [guide d'installation](INSTALLATION.fr.md). En bref, dans l'onglet **Modules** de l'écran d'accueil de Foundry, **Installer un module**, puis coller :

```
https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
```

## Paramètres

Dans *Paramètres → Configurer les paramètres → L'Ombre du Seigneur Démon - Échanges* :

| Paramètre | Par défaut |
|---|---|
| Messages des échanges | Personnes concernées |
| Messages des récompenses | Tout le monde |
| Messages des achats | Personnes concernées |
| Les achats doivent être validés par le MJ | activé |
| Unité des prix sans unité | CO |

Pour chaque famille de messages du chat, le MJ choisit qui les reçoit : **Aucun message**, **MJ seulement**, **Personnes concernées** (le MJ et les joueurs impliqués) ou **Tout le monde**. Des récompenses réservées à certains personnages ne sont jamais montrées aux autres.

## Bon à savoir

- **Un MJ doit être connecté.** Un joueur ne peut pas modifier le personnage d'un autre joueur : c'est le client du MJ qui valide les actions et fait les transferts.
- **Personnages du groupe** — Seuls comptent les personnages attribués à un joueur ou possédés nommément par un joueur. Un acteur que tout le monde possède par défaut (jeton partagé, marqueur de carte) n'apparaît pas.
- **Échanges** — L'argent s'échange pièce par pièce, sans rendu de monnaie : pour donner 1 CA, il faut posséder 1 CA. Si un objet offert a disparu avant l'approbation, l'échange revient en négociation et le chat en donne la raison.
- **Boucliers** — Le système définit chaque bouclier deux fois : une arme (pour frapper) et une armure (pour la Défense), portant le même nom. Le module les traite comme un seul objet : seule la version armure est affichée, et échanger, prendre ou acheter le bouclier fait passer les deux.
- **Objets reçus** — Ils ne fusionnent pas avec un objet identique déjà possédé.
- **Boutiques** — Une boutique garde une référence vers l'objet d'origine : s'il est supprimé, il ne peut plus être acheté. Le butin, lui, garde une copie.

## Développement

```bash
npm test
```

Les tests couvrent la logique (négociation, transferts, monnaie, prix, butin, boutiques et demandes d'achat, boucliers, destinataires des messages) et tournent avec `node --test`, sans Foundry.

## Licence

MIT
