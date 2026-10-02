# L'Ombre du Seigneur Démon - Échanges

Module Foundry VTT pour le système **Shadow of the Demon Lord** (`demonlord`) : les joueurs négocient des échanges d'objets et d'argent entre leurs personnages, et le MJ les approuve.

## Déroulement

1. Un joueur ouvre **Échanges** dans la barre d'outils de gauche, choisit son personnage et celui d'un autre joueur, puis clique **Proposer**.
2. La fenêtre d'échange s'ouvre chez les deux joueurs. Chacun dépose des objets de son inventaire (armes, armures, munitions, reliques, équipement) et de l'argent (CO, CA, SC, éclats).
3. Chacun clique **Valider l'échange**. Toute modification d'une offre annule les deux validations.
4. Le MJ reçoit un message dans le chat, ouvre l'échange et clique **Approuver** ou **Refuser**.
5. À l'approbation, les objets et l'argent changent de main. Un objet reçu arrive déséquipé.

Chaque étape (proposition, validation, approbation, refus, annulation) est notée dans le chat, en message privé au MJ et aux deux joueurs. Le MJ voit tous les échanges en cours depuis la fenêtre **Échanges**.

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
