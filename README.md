# Compresseur de Luluclc3

Application web de compression avec interface premium.

## V2
- Compression ZIP locale avec fflate.
- Glisser-déposer et sélection de fichiers.
- Profils Smart, Plus petit et Ultra VIP.
- Code VIP de démonstration : `luluclc3`.
- Interface responsive.
- Explication claire des limites de compression vidéo.

## Important
Le code VIP est côté client dans cette version de démonstration. Pour un vrai système VIP en production, il faut une validation côté serveur et une gestion de session/licence.

La V2 compresse les fichiers en ZIP sans perte. Les vidéos déjà compressées ne deviennent généralement pas beaucoup plus petites avec ZIP. Un vrai gain vidéo nécessite du réencodage avec FFmpeg/WebAssembly ou un service de transcodage.

## Déploiement
Le projet est un site statique et peut être publié avec GitHub Pages.
