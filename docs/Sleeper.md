Sleeper
=======

Pour réduire la charge serveur, un système de veille est progressivement mis en place. Son rôle est est de stopper les activités en tâche de fond en fonction des évènements. Lorsque plus aucun évènement ne se produit pour une durée donnée, par défaut 2 minutes, les fonctions agissant en vérifiant la veille sont stoppées et, si une activité est détectée, redémarrées.

Il est important de noter que Sleeper est accessible globalement par window.Sleeper.

La fonction Sleeper.awake( ... ) vérifie si le système est en veille ou non. Lorsque le système est effectivement en veille, le paramètre de Sleeper.awake doit être une fonction qui sera executée lors de la sortie de veille. Ainsi si une fonction est executée régulièrement, à l'aide de window.setTimeout, par exemple, elle devrait être entourée de 

  if(window.Sleeper.awake( _restart-callback_ )) {

  }

