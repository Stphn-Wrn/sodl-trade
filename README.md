# L'Ombre du Seigneur Démon - Échanges

Module Foundry VTT pour le système **Shadow of the Demon Lord** (`demonlord`) : les joueurs négocient des échanges d'objets et d'argent entre leurs personnages, et le MJ les approuve.

La fenêtre s'ouvre avec le bouton **⇄ Échanges** de la barre d'outils de gauche. Elle a trois onglets : **Échanges** (entre joueurs), **Récompenses** (le butin commun) et **Achats** (les boutiques). Un joueur qui possède plusieurs personnages choisit sous les onglets celui avec lequel il agit ; sa bourse est affichée à côté.

## Échanges

1. Un joueur ouvre l'onglet **Échanges**, choisit le personnage d'un autre joueur, puis clique **Proposer**.
2. La fenêtre d'échange s'ouvre chez les deux joueurs. Chacun dépose des objets de son inventaire (armes, armures, munitions, reliques, équipement) et de l'argent (CO, CA, SC, éclats).
3. Chacun clique **Valider l'échange**. Toute modification d'une offre annule les deux validations.
4. Le MJ reçoit un message dans le chat, ouvre l'échange et clique **Approuver** ou **Refuser**.
5. À l'approbation, les objets et l'argent changent de main. Un objet reçu arrive déséquipé.

Chaque étape (proposition, validation, approbation, refus, annulation) est notée dans le chat, en message privé au MJ et aux deux joueurs. Le MJ voit tous les échanges en cours depuis la fenêtre **Échanges**.

## Récompenses

L'onglet **Récompenses** est le butin commun du groupe.

- Les récompenses sont **fermées par défaut** : l'onglet est grisé pour les joueurs. Le MJ prépare le butin tranquillement, puis clique **Ouvrir aux joueurs** ; un message dans le chat les prévient. **Fermer aux joueurs** le referme à tout moment.
- **Tout ce que le MJ dépose est caché** (œil barré). Il prépare le butin à l'avance, puis dévoile chaque trésor d'un clic sur l'œil, l'argent à part, ou tout d'un coup avec **Tout dévoiler**. Chaque dévoilement est annoncé dans le chat (« Trésor dévoilé : Épée longue »), sauf tant que les récompenses sont fermées.
- **Le MJ** y glisse ce que le groupe a trouvé (objets de la barre latérale, d'un compendium ou de la fiche d'un PNJ) et y inscrit l'argent. L'objet déposé est une copie : l'original reste où il était.
- **Les joueurs** prennent directement ce qu'ils veulent, à l'unité, pour leur personnage, ainsi que l'argent. Ils reçoivent une notification quand de nouvelles récompenses arrivent.
- **Partager l'argent** : le MJ coche les personnages concernés et partage l'argent à parts égales. La monnaie est faite automatiquement (1 CO = 10 CA = 100 SC = 1000 éclats), et ce qui ne se divise pas reste dans le butin.

Chaque prise et chaque partage est annoncé publiquement dans le chat.

## Achats

L'onglet **Achats** regroupe des boutiques en catégories (Forgeron, Alchimiste…).

- **Le MJ** crée une catégorie, puis la remplit : en collant l'ID (ou l'UUID) d'un dossier d'objets et en cliquant **Importer**, en glissant un dossier entier sur la catégorie, ou en y glissant des objets un par un. Les sous-dossiers sont inclus, et les dossiers de compendium fonctionnent aussi.
- Chaque objet reprend son **nom**, son **prix** et sa **disponibilité** (commun, inhabituel, rare, exotique). Le MJ peut modifier le prix (par exemple « 1 CO 5 CA ») et la disponibilité de chaque objet.
- Un prix qui n'est qu'un nombre, comme « 5 », est compté dans l'unité choisie dans les paramètres du module (CA par défaut). Un objet sans prix lisible affiche « Prix à fixer » et ne peut pas être acheté.
- **Les joueurs** achètent directement : le prix est débité de leur bourse, et le marchand rend la monnaie. Un objet vendu en lot (20 flèches, par exemple) est livré en entier pour le prix du lot.
- La boutique garde une référence vers l'objet d'origine : s'il est supprimé, il ne peut plus être acheté.

Chaque achat est annoncé publiquement dans le chat.

## Paramètres du module

Dans *Paramètres → Configurer les paramètres → L'Ombre du Seigneur Démon - Échanges* :

- **Annoncer les récompenses dans le chat** (activé par défaut) : ouverture des récompenses, trésors dévoilés, prises et partages d'argent.
- **Annoncer les achats dans le chat** (activé par défaut).
- **Unité des prix sans unité** (CA par défaut).

Les messages d'échange entre joueurs sont toujours envoyés, en privé au MJ et aux deux joueurs.

## Prérequis

- Foundry VTT v13 ou v14, système `demonlord` 6.1.0 ou plus.
- **Un MJ doit être connecté** : les joueurs ne peuvent pas modifier le personnage d'un autre joueur, c'est donc le client du MJ qui effectue le transfert.

## Limites

- L'argent s'échange pièce par pièce, sans rendu de monnaie : pour donner 1 CA, il faut posséder 1 CA.
- Les objets reçus ne fusionnent pas avec un objet identique déjà possédé.
- Si un objet offert a été consommé ou vendu avant l'approbation, l'échange revient en négociation et le chat en donne la raison.

## Développement

```bash
npm test
```
