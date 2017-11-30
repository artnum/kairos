Facteur de zoom pour des intervalles données
============================================

À l'affichage d'une réservation ([reservation.js](artnum/location/blob/master/widgets/reservation.js)), la durée d'une heure peut être différente en fonction d'un facteur de zoom déterminé. Une journée est représentée, à l'écran, sous une forme d'une case d'une longueur X. Chaque heure de la journée peut ne pas avoir la même importance, ainsi il est possible d'informer une largeur différente pour une heure dans une intervalle que pour une autre. Prenons le cas d'une case d'une longueur de 48 pixels à l'écran :

     1             8              16              24              32              40            48    [px]
     |             |               |               |               |               |             | 
    +.+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+.+
    | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
    +.+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+.+

Dans un cas sans facteur zoom, toutes les heures vont occuper 2 pixels car 48 / 24 = 2.

     1             8                 48    [px] 
     |             |                  | 
    +.+-+-+-+-+-+-+.+-+-+-+-+//+-+-+-+.+
    |a|a|b|b|c|c|d|d|e|e|f|f|  |w|w|x|x|
    +.+-+-+-+-+-+-+.+-+-+-+-+//+-+-+-+.+

Si nous désirons accentuer une période, en terme de visibilité, nous pouvons activer un facteur de zoom pour cette période. Ainsi cette période utilisera plus de pixels à l'écran et le reste sera réduit d'autant de manière à ne pas déformer la case dans sa longueur. Par exemple, si nous décidons que la période de 6h à 12h est plus important, visuellement, et activons un facteur zoom de 2, nous aurons 4 pixel pour la période alors que le reste n'utilisera qu'environ un pixel :

     1             8              16              24              32              40            48    [px]
     |             |               |               |               |               |             | 
    +.+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+.+
    |a|b|c|d|e|f|f|f|f|g|g|g|g|h|h|h|h|i|i|i|i|j|j|j|j|k|k|k|k|l|l|l|l|~|m|n|o|p|q|q|r|s|t|u|v|w|x|
    +.+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+-+.+-+-+-+-+-+-+.+
                                                                       |
                                                           Arrondi <---+


