# L'Ombre du Seigneur Démon - Échanges et artisanat

[English version](README.md)

Module Foundry VTT pour **L'Ombre du Seigneur Démon** : échanges négociés entre joueurs et approuvés par le MJ, butin commun dévoilé au fil de la partie, boutiques avec prix, disponibilité et stock, et artisanat à partir de recettes (potions, poisons…).

**Compatibilité :** Foundry VTT v13+ (testé sur v14) | Système `demonlord` v6.1.0+

**Langues :** français et anglais, selon la langue choisie dans Foundry (*Paramètres → Configurer les paramètres → Paramètres principaux → Langue*).

## Ce qu'il y a dedans

Tout passe par la fenêtre **Échanges**, ouverte par le bouton à double flèche de la barre d'outils de gauche. Elle a cinq onglets : **Échanges**, **Récompenses**, **Achats**, **Artisanat** et **Récolte**. Sous les onglets, un bandeau montre le personnage du joueur (portrait, nom, bourse). Un joueur qui possède plusieurs personnages y choisit celui avec lequel il agit.

Un compteur sur le bouton de la barre d'outils, et sur chaque onglet, signale ce qui attend : échanges, demandes d'achat et de fabrication à valider pour le MJ ; échanges en cours et trésors à prendre pour les joueurs.

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

### Artisanat (recettes)
- **Ressources de base** — Le bouton **Créer les ressources** ajoute aux objets du monde un dossier « Ressources d'artisanat » de 44 objets en 6 catégories (plantes et champignons, minéraux et métaux, parties de créatures, composants alchimiques, matériaux d'artisan, autres mondes), avec prix, disponibilité et description. Ils servent d'ingrédients, et peuvent aussi être vendus en boutique ou placés dans les récompenses. Un nouveau clic ne recrée que ce qui manque, même si le MJ a renommé ou déplacé les objets.
- **Recettes par défaut** — Le bouton **Recettes par défaut** ajoute 16 recettes prêtes : le poison de l'Assassin (livre de base), des potions du livre de base (soins, anti-toxine, résistance au feu, vigilance) dont les matériaux suivent la règle du Compagnon (un quart du prix, moins la valeur des ingrédients demandés), et des recettes maison qui transforment les ressources (huile, torches, bougies, flèches, lingots, cuir, alcool, poudre d'os). Les ressources manquantes sont créées, et les objets du livre sont cherchés par nom (anglais ou français) dans le monde puis les compendiums : une recette dont un objet est introuvable est ignorée et signalée. Les recettes ne sont connues de personne tant que le MJ ne les apprend pas.
- **Recettes** — Le bouton **Modifier les recettes** passe en édition. Le MJ crée une recette, y glisse l'objet fabriqué (potion, poison, munitions…) et règle la quantité produite, puis glisse les ingrédients consommés (avec la quantité de chacun) et les outils requis, qui doivent être possédés mais ne sont pas consommés (trousse d'alchimiste, outils de forgeron…). Le temps indicatif et le jet d'attribut sont facultatifs.
- **Règles du Compagnon** — Suivant *Fabriquer des équipements* (Compagnon du Seigneur Démon), le coût des matériaux est rempli automatiquement au quart du prix de l'objet fabriqué, arrondi au supérieur ; le MJ peut le changer ou le vider. La profession appropriée se gère en apprenant la recette aux personnages qui l'ont, et le test d'Intellect pour un objet simple est le jet de la recette.
- **Prérequis** — Une recette peut exiger un métier, une voie, un talent ou une ascendance : le MJ en glisse un, ou tape un mot comme « forgeron ». Le prérequis est rempli si le personnage a un élément copié de celui glissé, ou dont le nom contient le mot (« forgeron » reconnaît « Artisan (forgeron) », sans tenir compte des accents). S'il y en a plusieurs, un seul suffit. Le joueur voit les prérequis en vert ou en orange, et ne peut pas fabriquer sans.
- **Jet** — Si la recette demande un jet (Force, Agilité, Intellect ou Volonté, avec des faveurs ou des pénalités), il est lancé par le système avec les bonus du personnage et réussit sur 10 ou plus. En cas d'échec, les ingrédients et l'argent sont perdus et rien n'est fabriqué.
- **Recettes apprises** — Chaque recette est apprise à des personnages précis, d'un clic sur leur nom. Un joueur ne voit que les recettes de son personnage, et il est prévenu quand il en apprend une. Tant qu'il n'en connaît aucune, l'onglet est grisé.
- **Fabriquer** — Pour chaque ingrédient, le joueur voit ce qu'il possède et ce qu'il faut. Le bouton **Fabriquer** reste grisé s'il manque un ingrédient ou de l'argent. Un ingrédient est reconnu à son nom (sans tenir compte des majuscules ni des accents), ou à l'objet dont il est la copie s'il a été renommé ; plusieurs piles s'additionnent.
- **Validation** — Par défaut, la fabrication est immédiate. Si le MJ active la validation dans les paramètres, le joueur envoie une demande que le MJ valide ou refuse, comme pour les achats ; rien n'est consommé avant.
- **Désactiver** — Une table qui n'en veut pas désactive l'artisanat dans les paramètres : l'onglet disparaît.

### Récolte
- **Mondes et biomes** — Chaque biome a sa table : une ligne par objet, avec une **chance en %** et une **quantité en dés** (1d3, 2d4 ou un nombre). Le reste jusqu'à 100 % ne donne rien. Le monde des mortels compte sept biomes (forêt, marais, montagnes, souterrains, plaines et landes, ruines et cimetières, côtes et rivières), et chaque autre monde du livre de base a le sien : Royaumes cachés, Royaume des morts, Enfer et Vide. Les ruines se fouillent plutôt qu'elles ne se cueillent : ferraille, fioles, tissu.
- **Modifier les biomes** — Le MJ crée, renomme et supprime des mondes et des biomes (avec la description montrée aux joueurs), glisse n'importe quel objet dans un biome et règle sa chance et ses dés. Le total d'un biome ne peut pas dépasser 100 %. La carte de départ vient du catalogue livré, où les chances découlent de la rareté de chaque ressource ; **Réinitialiser depuis le catalogue** y revient.
- **Ouvrir** — Le MJ choisit le biome où se trouve le groupe, le jet (Perception par défaut) et ses faveurs, puis ouvre la récolte. Il voit ce qu'on peut y trouver, avec la chance écrite et la chance réelle selon l'état du monde.
- **Récolter** — Chaque personnage fouille une fois. Le jet passe par le système : un échec ne donne rien, une réussite donne une fouille, et 20 ou plus en donne deux. Ce qui est trouvé rejoint la pile que le personnage possède déjà. **Renouveler** permet de recommencer (après une journée de recherche, par exemple), et **Fermer** met fin à la récolte.
- **Un monde mourant** — Les chances écrites sont celles d'un monde préservé. Le paramètre **État du monde** les multiplie toutes : ×1 (préservé), ×0,5 (mourant, par défaut) ou ×0,25 (dévasté).
- **Ressources** — La version du monde d'une ressource (prix ou description modifiés par le MJ) est utilisée si elle existe, sinon celle du catalogue.

## Installation

Voir le [guide d'installation](INSTALLATION.fr.md). En bref, dans l'onglet **Modules** de l'écran d'accueil de Foundry, **Installer un module**, puis coller :

```
https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
```

## Paramètres

Dans *Paramètres → Configurer les paramètres → L'Ombre du Seigneur Démon - Échanges et artisanat* :

| Paramètre | Par défaut |
|---|---|
| Activer les échanges, les récompenses, les boutiques, l'artisanat, la récolte (un interrupteur chacun) | activé |
| Messages des échanges | Personnes concernées |
| Messages des récompenses | Tout le monde |
| Messages des achats | Personnes concernées |
| Les achats doivent être validés par le MJ | activé |
| Messages de l'artisanat et de la récolte | Personnes concernées |
| État du monde | Mourant |
| Les fabrications doivent être validées par le MJ | désactivé |
| Unité des prix sans unité | CO |

Chaque partie du module se désactive séparément : son onglet disparaît, et le client du MJ refuse les demandes qui la concernent. Si tout est désactivé, le bouton de la barre d'outils disparaît aussi.

Pour chaque famille de messages du chat, le MJ choisit qui les reçoit : **Aucun message**, **MJ seulement**, **Personnes concernées** (le MJ et les joueurs impliqués) ou **Tout le monde**. Des récompenses réservées à certains personnages ne sont jamais montrées aux autres.

## Bon à savoir

- **Un MJ doit être connecté.** Un joueur ne peut pas modifier le personnage d'un autre joueur : c'est le client du MJ qui valide les actions et fait les transferts.
- **Personnages du groupe** — Seuls comptent les personnages attribués à un joueur ou possédés nommément par un joueur. Un acteur que tout le monde possède par défaut (jeton partagé, marqueur de carte) n'apparaît pas.
- **Échanges** — L'argent s'échange pièce par pièce, sans rendu de monnaie : pour donner 1 CA, il faut posséder 1 CA. Si un objet offert a disparu avant l'approbation, l'échange revient en négociation et le chat en donne la raison.
- **Boucliers** — Le système définit chaque bouclier deux fois : une arme (pour frapper) et une armure (pour la Défense), portant le même nom. Le module les traite comme un seul objet : seule la version armure est affichée, et échanger, prendre ou acheter le bouclier fait passer les deux. Si un personnage n'a qu'une des deux moitiés (seulement l'arme, par exemple), celui qui la reçoit dans un échange reçoit aussi l'autre, cherchée dans les objets du monde puis dans les compendiums, sauf s'il la possède déjà.
- **Objets reçus** — Ils ne fusionnent pas avec un objet identique déjà possédé.
- **Boutiques** — Une boutique garde une référence vers l'objet d'origine : s'il est supprimé, il ne peut plus être acheté. Le butin, lui, garde une copie. Une recette fonctionne comme une boutique : si l'objet fabriqué d'origine est supprimé, elle ne fonctionne plus.

## Développement

```bash
npm test
```

Les tests couvrent la logique (négociation, transferts, monnaie, prix, butin, boutiques et demandes d'achat, recettes et fabrication, récolte, boucliers, destinataires des messages) et tournent avec `node --test`, sans Foundry.

## Licence

MIT
