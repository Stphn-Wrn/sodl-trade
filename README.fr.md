# L'Ombre du Seigneur Démon - Échanges

[English version](README.md)

Module Foundry VTT pour **L'Ombre du Seigneur Démon** : échanges négociés entre joueurs et approuvés par le MJ, butin commun dévoilé au fil de la partie, et boutiques avec prix, disponibilité et stock.

**Compatibilité :** Foundry VTT v13+ (testé sur v14) | Système `demonlord` v6.1.0+

**Langues :** français et anglais, selon la langue choisie dans Foundry (*Paramètres → Configurer les paramètres → Paramètres principaux → Langue*).

## Ce qu'il y a dedans

Tout passe par la fenêtre **Échanges**, ouverte par le bouton à double flèche de la barre d'outils de gauche. Elle a trois onglets : **Échanges**, **Récompenses** et **Achats**. Sous les onglets, un bandeau montre le personnage du joueur (portrait, nom, bourse). Un joueur qui possède plusieurs personnages y choisit celui avec lequel il agit.

### Échanges entre joueurs
- **Proposer** — Dans l'onglet Échanges, le joueur clique sur le portrait d'un autre personnage. La fenêtre de négociation s'ouvre chez les deux joueurs.
- **Négocier** — Chacun voit son inventaire à droite, rangé comme sur sa fiche (**Combat** et **Inventaire**). Il glisse les objets dans sa colonne, ou clique dessus pour en ajouter un. Les objets peuvent aussi être glissés depuis la fiche du personnage. La quantité se règle dans l'offre, et l'argent se saisit pièce par pièce, avec ce que le personnage possède indiqué à côté.
- **Valider** — Chacun clique **Valider l'échange**. Toute modification d'une offre annule les deux validations.
- **Approbation du MJ** — Le MJ reçoit un message dans le chat, ouvre l'échange, puis l'approuve ou le refuse. À l'approbation, les objets et l'argent changent de main. Un objet reçu arrive déséquipé.
- **Suivi** — Chaque étape est notée dans le chat, en message privé au MJ et aux deux joueurs. Le MJ voit tous les échanges en cours dans l'onglet Échanges.

### Récompenses (butin commun)
- **Fermé par défaut** — L'onglet est grisé pour les joueurs. Le MJ prépare le butin, puis clique **Ouvrir aux joueurs**. **Fermer aux joueurs** le referme à tout moment.
- **Préparer** — Le bouton **Préparer** passe en édition : le MJ glisse ce que le groupe a trouvé (barre latérale, compendium, fiche d'un PNJ), règle les quantités et saisit l'argent. **Terminer** revient à la vue de jeu. L'objet déposé est une copie : l'original reste où il était.
- **Dévoiler au fur et à mesure** — Tout ce que le MJ dépose est caché. En vue de jeu, il dévoile chaque trésor d'un clic sur l'œil, l'argent à part, ou tout d'un coup avec **Tout dévoiler**. Les joueurs ne voient et ne peuvent prendre que ce qui est dévoilé.
- **Se servir** — Les joueurs prennent directement ce qu'ils veulent, à l'unité, ainsi que l'argent.
- **Partager l'argent** — Le MJ sélectionne les personnages concernés (tous par défaut) et partage l'argent à parts égales. La monnaie est faite automatiquement (1 CO = 10 CA = 100 SC = 1000 éclats), et ce qui ne se divise pas reste dans le butin.

### Achats (boutiques)
- **Catégories** — Les boutiques sont rangées en catégories (Forgeron, Alchimiste…), repliables d'un clic sur leur en-tête.
- **Remplir** — Le bouton **Modifier les boutiques** passe en édition. Le MJ remplit une catégorie en collant l'ID ou l'UUID d'un dossier d'objets puis en cliquant **Importer**, en glissant un dossier entier sur la catégorie, ou en y glissant des objets un par un. Les sous-dossiers sont inclus, et les dossiers de compendium fonctionnent aussi.
- **Prix et disponibilité** — Chaque objet reprend son nom, son prix et sa disponibilité (commun, inhabituel, rare, exotique), que le MJ peut modifier. Un prix s'écrit par exemple « 1 CO 5 CA ». Un nombre seul, comme « 5 » ou « 0.5 », est compté dans l'unité choisie dans les paramètres (CO par défaut, comme le système), et les décimales sont converties en pièces : 0.5 CO devient 5 CA. Un objet sans prix lisible affiche « Prix à fixer » et ne peut pas être acheté.
- **Stock** — Illimité par défaut. Le MJ saisit le nombre de lots disponibles (champ vide = illimité) et réapprovisionne quand il veut. Chaque achat retire les lots achetés ; à 0, l'objet est « Épuisé ».
- **Acheter** — Le prix est débité de la bourse du joueur, et le marchand rend la monnaie. Un objet vendu en lot (20 flèches, par exemple) est livré entier pour le prix du lot.

## Installation

Voir le [guide d'installation](INSTALLATION.fr.md). En bref, dans l'onglet **Modules** de l'écran d'accueil de Foundry, **Installer un module**, puis coller :

```
https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
```

## Paramètres

Dans *Paramètres → Configurer les paramètres → L'Ombre du Seigneur Démon - Échanges* :

| Paramètre | Par défaut |
|---|---|
| Annoncer les récompenses dans le chat (ouverture, trésors dévoilés, prises, partages) | activé |
| Annoncer les achats dans le chat | activé |
| Unité des prix sans unité | CO |

Les messages d'échange entre joueurs sont toujours envoyés, en privé au MJ et aux deux joueurs.

## Bon à savoir

- **Un MJ doit être connecté.** Un joueur ne peut pas modifier le personnage d'un autre joueur : c'est le client du MJ qui valide les actions et fait les transferts.
- **Personnages du groupe** — Seuls comptent les personnages attribués à un joueur ou possédés nommément par un joueur. Un acteur que tout le monde possède par défaut (jeton partagé, marqueur de carte) n'apparaît pas.
- **Échanges** — L'argent s'échange pièce par pièce, sans rendu de monnaie : pour donner 1 CA, il faut posséder 1 CA. Si un objet offert a disparu avant l'approbation, l'échange revient en négociation et le chat en donne la raison.
- **Objets reçus** — Ils ne fusionnent pas avec un objet identique déjà possédé.
- **Boutiques** — Une boutique garde une référence vers l'objet d'origine : s'il est supprimé, il ne peut plus être acheté. Le butin, lui, garde une copie.

## Développement

```bash
npm test
```

Les tests couvrent la logique (négociation, transferts, monnaie, prix, butin, boutique) et tournent avec `node --test`, sans Foundry.

## Licence

MIT
