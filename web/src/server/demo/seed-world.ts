import type { ArchiveCase } from './seed-archive';

// Des affaires RÉELLES, à Madagascar et dans le monde : des rumeurs et des faits bien documentés.
// Elles reprennent les positions publiques d'institutions (OMS, UIT, sociétés de toxicologie…) et de
// vérificateurs reconnus, RÉSUMÉES avec nos mots : pas de citation, pas de lien, et aucune pièce
// inventée. Les formulations « relevées » des rumeurs sont des formulations types, pas des
// publications précises. À relire avant toute diffusion.

export const WORLD: ArchiveCase[] = [
  // ─── Madagascar ───────────────────────────────────────────────────────────────────────────────
  {
    title: 'Le Covid-Organics prévient et guérit le Covid-19',
    claim: 'La tisane malgache Covid-Organics, à base d’Artemisia, prévient et guérit le Covid-19.',
    kind: 'real',
    createdDaysAgo: 30,
    versions: [
      {
        content:
          'Lancement de Covid-Organics, une boisson à base d’Artemisia annua, présentée comme préventive et curative du Covid-19.',
        source: 'Présidence de la République de Madagascar',
        date: '2020-04-20T10:00:00+03:00',
      },
      {
        content:
          'Une tisane malgache guérit le Covid-19 ! Elle est déjà envoyée à d’autres pays africains.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2020-04-25T09:00:00+03:00',
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: '« Présentée comme préventive et curative » devient « guérit » : une annonce devient un fait établi.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Position de l’OMS sur l’automédication',
        content:
          'L’OMS ne recommande pas l’automédication, y compris par des remèdes à base de plantes, pour prévenir ou guérir le Covid-19.',
        source: 'OMS (Organisation mondiale de la santé)',
        date: '2020-04-30T12:00:00+03:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Aucune preuve scientifique à ce stade',
        content:
          'L’OMS indique ne disposer d’aucune preuve scientifique de la sécurité et de l’efficacité de Covid-Organics.',
        source: 'OMS (point de presse)',
        date: '2020-05-14T12:00:00+03:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Réserve de l’Académie nationale de médecine',
        content:
          'L’Académie nationale de médecine de Madagascar estime que les preuves scientifiques n’ont pas été établies.',
        source: 'Académie nationale de médecine de Madagascar',
        date: null,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Une proposition d’essai clinique',
        content:
          'L’OMS et l’Africa CDC proposent de tester le produit dans un essai clinique conforme aux standards internationaux.',
        source: 'OMS et Africa CDC',
        date: '2020-05-14T12:00:00+03:00',
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'insufficient',
      vote: 'unsure',
      prosecution: {
        argument:
          'L’affirmation dit « prévient et guérit ». L’OMS déclare n’avoir aucune preuve de sécurité ni d’efficacité (pièce n° 2), et l’Académie nationale de médecine partage cette réserve (pièce n° 3).',
        cited: [2, 3],
      },
      defense: {
        argument:
          'Le produit existe et repose sur une plante étudiée. L’OMS ne l’exclut pas et propose de le tester (pièce n° 4). Personne n’a démontré qu’il est inefficace.',
        cited: [4],
      },
      confirmed: ['Une boisson à base d’Artemisia a été lancée en avril 2020.'],
      contested: ['« Prévient et guérit » : aucune preuve publiée (pièces n° 1 à 3).'],
      missing: ['Les résultats d’un essai clinique publié.'],
      conclusion:
        'Les informations sont insuffisantes. Rien ne prouve que la tisane prévient ou guérit le Covid-19, mais rien ne prouve non plus le contraire, faute d’essai clinique publié. Il ne faut donc pas la présenter comme un remède.',
      whatToCheck:
        'Les résultats d’un essai clinique mené selon les standards internationaux, que l’OMS et l’Africa CDC proposaient d’appuyer.',
    },
  },
  {
    title: 'La peste a disparu de Madagascar',
    claim: 'La peste est une maladie du passé : il n’y a plus de cas à Madagascar.',
    kind: 'real',
    createdDaysAgo: 25,
    versions: [
      {
        content: 'La peste n’existe plus aujourd’hui, c’est une maladie du Moyen Âge.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2017-09-05T09:00:00+03:00',
      },
    ],
    links: [],
    evidence: [
      {
        title: 'L’épidémie de 2017',
        content:
          'L’OMS a recensé 2 348 cas confirmés, probables et suspects de peste, dont 202 décès, au 22 novembre 2017, en majorité des formes pulmonaires.',
        source: 'OMS (Disease Outbreak News)',
        date: '2017-11-27T12:00:00+03:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Une maladie qui revient chaque saison',
        content:
          'La peste est présente à l’état endémique à Madagascar et provoque des cas chaque saison, de septembre à avril environ.',
        source: 'OMS',
        date: null,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Elle se soigne',
        content:
          'La peste se soigne avec des antibiotiques si elle est détectée tôt, ce qui explique l’importance de consulter vite.',
        source: 'OMS',
        date: null,
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'La peste n’a pas disparu : l’OMS a compté 2 348 cas et 202 décès en 2017 (pièce n° 1), et la maladie revient chaque saison (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'La peste se soigne bien aujourd’hui avec des antibiotiques (pièce n° 3) : l’idée d’une maladie « du passé » vient peut-être de là. Je n’ai aucune pièce qui dise qu’elle a disparu.',
        cited: [3],
      },
      confirmed: ['La peste se soigne si elle est détectée tôt (pièce n° 3).'],
      contested: [
        'Plus aucun cas : 2 348 cas en 2017 (pièce n° 1).',
        'Une maladie du passé : elle revient chaque saison (pièce n° 2).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite. La peste existe encore à Madagascar et revient chaque saison. Elle se soigne si l’on consulte tôt : la rumeur est dangereuse parce qu’elle fait baisser la vigilance.',
      whatToCheck: 'Les points de situation de l’OMS et du ministère de la Santé publique.',
    },
  },
  {
    title: 'La saison de la peste, de septembre à avril',
    claim:
      'À Madagascar, la peste revient chaque année entre septembre et avril, et se soigne si l’on consulte vite.',
    kind: 'real',
    createdDaysAgo: 22,
    versions: [
      {
        content:
          'La peste est endémique à Madagascar : des cas sont signalés chaque année, surtout de septembre à avril. Consultez vite en cas de fièvre forte.',
        source: 'OMS',
        date: '2017-10-02T09:00:00+03:00',
      },
      {
        content:
          'Attention, c’est la saison de la peste : fièvre forte, ganglions, toux avec crachats de sang, allez vite au centre de santé.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2017-10-06T09:00:00+03:00',
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'shared_unchanged',
        note: 'Même message de prévention, repris avec les signes à surveiller.',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Une maladie endémique',
        content:
          'La peste est endémique à Madagascar : elle y provoque des cas chaque année, avec une saison qui s’étend de septembre à avril.',
        source: 'OMS',
        date: null,
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'La flambée urbaine de 2017',
        content:
          'En 2017, la maladie a pris une forme pulmonaire dans des villes, ce qui a conduit à une réponse d’urgence coordonnée par l’OMS et le ministère.',
        source: 'OMS (Disease Outbreak News)',
        date: '2017-10-02T09:00:00+03:00',
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'Un traitement existe',
        content:
          'La peste se traite avec des antibiotiques, surtout s’ils sont donnés tôt après le début des symptômes.',
        source: 'OMS',
        date: null,
        stance: 'supports',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'established',
      vote: 'accurate',
      prosecution: {
        argument:
          'Je cherche une exagération : le message ne donne pas de chiffres et ne désigne aucun lieu. Rien dans les pièces ne le contredit (pièces n° 1 à 3).',
        cited: [1, 2, 3],
      },
      defense: {
        argument:
          'L’OMS confirme que la peste est endémique et saisonnière (pièce n° 1), que la forme pulmonaire de 2017 a touché des villes (pièce n° 2) et qu’un traitement existe (pièce n° 3).',
        cited: [1, 2, 3],
      },
      confirmed: [
        'La peste est endémique à Madagascar, de septembre à avril environ (pièce n° 1).',
        'Elle se traite par antibiotiques si elle est détectée tôt (pièce n° 3).',
      ],
      contested: [],
      missing: [],
      conclusion:
        'L’information est établie. C’est un message de prévention exact : la peste revient chaque saison, et consulter tôt permet de la soigner. Il peut être partagé tel quel.',
      whatToCheck: 'Les consignes du ministère de la Santé publique pour la saison en cours.',
    },
  },
  // ─── International ────────────────────────────────────────────────────────────────────────────
  {
    title: 'La 5G propage le coronavirus',
    claim: 'La 5G propage le coronavirus, c’est pour cela que les antennes sont détruites.',
    kind: 'real',
    createdDaysAgo: 28,
    versions: [
      {
        content: 'La 5G affaiblit le système immunitaire et propage le coronavirus.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2020-03-28T09:00:00+01:00',
      },
    ],
    links: [],
    evidence: [
      {
        title: 'Fiche de l’OMS sur les idées reçues',
        content:
          'Les virus ne voyagent pas sur les ondes radio ni sur les réseaux mobiles, et le Covid-19 se propage dans des pays qui n’ont pas de 5G.',
        source: 'OMS (idées reçues sur le Covid-19)',
        date: '2020-04-01T12:00:00+02:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Position de l’Union internationale des télécommunications',
        content:
          'L’agence de l’ONU pour les télécoms qualifie la thèse d’un lien entre 5G et Covid-19 de canular sans fondement technique.',
        source: 'UIT (Union internationale des télécommunications)',
        date: '2020-04-22T12:00:00+02:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Comment le virus se transmet',
        content:
          'Le Covid-19 se transmet surtout par des gouttelettes respiratoires, quand une personne infectée tousse, éternue ou parle.',
        source: 'OMS',
        date: null,
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Un virus ne se propage pas par les ondes (pièce n° 1), et le Covid-19 circule dans des pays sans 5G. L’agence de l’ONU pour les télécoms parle de canular (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce en faveur de ce lien. Je rappelle seulement le vrai mode de transmission, par gouttelettes (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: [
        'Un lien entre la 5G et le virus : écarté par l’OMS et l’UIT (pièces n° 1 et 2).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite. La 5G ne propage pas le coronavirus : le virus se transmet par les gouttelettes respiratoires. Détruire des antennes ne protège personne.',
      whatToCheck: 'La fiche de l’OMS sur les idées reçues, régulièrement mise à jour.',
    },
  },
  {
    title: 'Les vaccins contiennent des micropuces',
    claim: 'Les vaccins contre le Covid-19 contiennent des micropuces pour suivre les gens.',
    kind: 'real',
    createdDaysAgo: 20,
    versions: [
      {
        content:
          'Bill Gates veut implanter des micropuces dans le monde entier grâce au vaccin contre le Covid-19.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2020-04-10T09:00:00+02:00',
      },
      {
        content:
          'Des vidéos montrent des aimants collés au bras après le vaccin : c’est la preuve de la puce.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2021-05-10T09:00:00+02:00',
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'related',
        note: 'La rumeur change de preuve : on passe d’un plan supposé à de prétendues images de la puce.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'La liste des ingrédients est publique',
        content:
          'Les vaccins contre le Covid-19 ont des listes d’ingrédients publiques ; aucune ne mentionne de micropuce.',
        source: 'FactCheck.org',
        date: '2021-01-15T12:00:00+01:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Aucun plan de puçage par un vaccin',
        content:
          'Le journal USA Today a conclu qu’aucun élément n’appuie l’idée d’un plan de puçage mondial par un vaccin ; l’affirmation est fausse.',
        source: 'USA Today (vérification)',
        date: '2020-06-01T12:00:00+02:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Des puces sur les seringues, pas dans les gens',
        content:
          'Certaines seringues portent une puce d’identification qui suit les flacons, pas les personnes ; elle n’est pas injectée.',
        source: 'PolitiFact',
        date: null,
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Les ingrédients des vaccins sont publics et ne mentionnent aucune puce (pièce n° 1). Aucun plan de puçage n’a été trouvé (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'La confusion vient peut-être de puces réelles sur les seringues, mais elles servent à suivre les flacons, pas les personnes (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: ['Une micropuce dans le vaccin : absente des ingrédients (pièce n° 1).'],
      missing: [],
      conclusion:
        'L’information est contredite. Les vaccins ne contiennent aucune micropuce. Les vidéos d’aimants ou de codes ne prouvent rien : elles sont déjà démenties.',
      whatToCheck: 'La liste des ingrédients du vaccin concerné, publiée par son fabricant.',
    },
  },
  {
    title: 'Le pape François soutient Donald Trump',
    claim: 'Le pape François a appelé à voter pour Donald Trump à l’élection américaine de 2016.',
    kind: 'real',
    createdDaysAgo: 18,
    versions: [
      {
        content: 'Le pape François stupéfie le monde et soutient Donald Trump pour la présidence.',
        source: 'WTOE 5 News (site se présentant comme d’actualité fantaisiste)',
        date: '2016-07-10T09:00:00-04:00',
      },
      {
        content: 'Le pape soutient Trump ! Partagez avant que les médias ne le cachent.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2016-07-12T09:00:00-04:00',
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: 'Le site fantaisiste disparaît de la reprise : il reste un « fait » et un appel à partager.',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'L’origine : un site d’actualité fantaisiste',
        content:
          'Snopes a retracé l’histoire jusqu’à un faux site d’information qui se décrit lui-même comme un site d’actualité fantaisiste.',
        source: 'Snopes',
        date: '2016-07-12T12:00:00-04:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Aucun soutien du pape',
        content:
          'FactCheck.org a conclu que le pape n’a pas soutenu Donald Trump : les papes ne soutiennent pas de candidats.',
        source: 'FactCheck.org',
        date: '2016-10-21T12:00:00-04:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Ce que le pape a dit aux électeurs catholiques',
        content:
          'Le pape a invité les électeurs catholiques à étudier les programmes, à prier et à choisir en conscience, sans nommer de candidat.',
        source: 'Presse internationale',
        date: null,
        stance: 'context',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'L’histoire vient d’un site qui se présente comme fantaisiste (pièce n° 1), et aucun soutien n’a existé (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Le pape a bien parlé à des électeurs catholiques, mais sans nommer personne (pièce n° 3). Je n’ai aucune pièce qui soutienne l’affirmation.',
        cited: [3],
      },
      confirmed: [],
      contested: [
        'Un soutien du pape à Trump : démenti par deux vérificateurs (pièces n° 1 et 2).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite. Elle vient d’un site qui se décrit comme d’actualité fantaisiste, et le pape n’a soutenu aucun candidat. Elle a pourtant été très partagée.',
      whatToCheck: 'La source d’origine : un site qui se présente lui-même comme fantaisiste.',
    },
  },
  {
    title: 'Les alunissages Apollo ont été truqués',
    claim:
      'Les missions Apollo n’ont jamais posé d’hommes sur la Lune : tout a été filmé en studio.',
    kind: 'real',
    createdDaysAgo: 15,
    versions: [
      {
        content:
          'L’homme n’a jamais marché sur la Lune, les images de 1969 ont été tournées en studio.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2019-07-20T09:00:00+00:00',
      },
    ],
    links: [],
    evidence: [
      {
        title: 'Des réflecteurs laissés sur la Lune',
        content:
          'Les missions Apollo 11, 14 et 15 ont laissé des réflecteurs laser sur la Lune. Ils fonctionnent encore.',
        source: 'NASA',
        date: null,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Des observatoires indépendants s’en servent',
        content:
          'Des observatoires en France, en Allemagne, en Italie et aux États-Unis envoient régulièrement des lasers vers ces réflecteurs pour mesurer la distance Terre–Lune au millimètre près.',
        source: 'Observatoires de télémétrie laser',
        date: null,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Des réflecteurs aussi sur des robots soviétiques',
        content:
          'Deux autres réflecteurs se trouvent sur les robots soviétiques Lunokhod 1 et 2, ce qui montre que la technique ne dépend pas d’une seule agence.',
        source: 'Agences spatiales',
        date: null,
        stance: 'context',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Des réflecteurs posés par Apollo sont encore utilisés aujourd’hui (pièce n° 1), notamment par des observatoires qui ne dépendent pas de la NASA (pièce n° 2). Un décor de studio ne laisse rien sur la Lune.',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce qui soutienne un tournage en studio. Je note seulement que d’autres engins ont aussi posé des réflecteurs (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: [
        '« Jamais posé d’hommes » : des réflecteurs Apollo y fonctionnent encore (pièce n° 1).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite. Des instruments déposés par les missions Apollo sont encore utilisés par des observatoires de plusieurs pays. Cela ne peut pas se fabriquer en studio.',
      whatToCheck: 'Les publications des observatoires qui font des mesures laser vers la Lune.',
    },
  },
  {
    title: 'L’eau de Javel guérit du Covid-19',
    claim: 'Boire de l’eau de Javel ou un désinfectant guérit du Covid-19.',
    kind: 'real',
    createdDaysAgo: 12,
    versions: [
      {
        content: 'Un désinfectant avalé ou injecté tuerait le virus dans le corps.',
        source: 'Réseaux sociaux (formulation type)',
        date: '2020-04-24T09:00:00-04:00',
      },
    ],
    links: [],
    evidence: [
      {
        title: 'Mise en garde des toxicologues',
        content:
          'Trois sociétés de toxicologie américaines ont publié un communiqué commun : les produits de nettoyage et les désinfectants ne doivent pas être avalés ni injectés.',
        source: 'AACT, ACMT et AAPCC (toxicologie)',
        date: '2020-04-24T12:00:00-04:00',
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Hausse des appels aux centres antipoison',
        content:
          'Une étude des CDC américains a relevé une hausse des appels aux centres antipoison pour des expositions à des produits de nettoyage et désinfectants en mars 2020.',
        source: 'CDC (États-Unis)',
        date: '2020-04-20T12:00:00-04:00',
        stance: 'context',
        strength: 'solid',
      },
      {
        title: 'Les fabricants eux-mêmes déconseillent',
        content:
          'Les fabricants de produits d’entretien ont demandé de ne jamais les injecter ni les avaler.',
        source: 'Fabricants de produits d’entretien',
        date: '2020-04-24T12:00:00-04:00',
        stance: 'contradicts',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Les toxicologues disent de ne jamais avaler ni injecter un désinfectant (pièce n° 1), et les fabricants le répètent (pièce n° 3).',
        cited: [1, 3],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce qui montre un bénéfice. La hausse des appels aux centres antipoison (pièce n° 2) montre au contraire les risques.',
        cited: [2],
      },
      confirmed: [],
      contested: ['Boire un désinfectant guérit : dangereux, aucune preuve (pièces n° 1 et 3).'],
      missing: [],
      conclusion:
        'L’information est contredite et dangereuse. Avaler ou injecter de l’eau de Javel ou un désinfectant n’a aucun effet contre le virus et peut tuer. En cas d’ingestion, appeler tout de suite un centre antipoison ou les urgences.',
      whatToCheck: 'Les consignes du centre antipoison ou du ministère de la Santé de votre pays.',
    },
  },
  {
    title: 'Comment se transmet le virus Ebola',
    claim:
      'Le virus Ebola se transmet par contact direct avec les liquides corporels d’une personne malade, pas comme la grippe.',
    kind: 'real',
    createdDaysAgo: 10,
    versions: [
      {
        content:
          'Ebola se transmet par contact direct avec le sang ou les liquides corporels d’une personne malade ou décédée, ou avec des objets contaminés.',
        source: 'OMS',
        date: '2014-09-01T09:00:00+00:00',
      },
    ],
    links: [],
    evidence: [
      {
        title: 'Fiche d’information de l’OMS',
        content:
          'Le virus se transmet par contact direct avec le sang ou les liquides corporels de personnes malades ou décédées, et par des objets contaminés. Il ne se transmet pas par l’air comme la grippe.',
        source: 'OMS (fiche d’information sur Ebola)',
        date: null,
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'Les rites funéraires comptent',
        content:
          'Le contact avec le corps d’une personne décédée lors des rites funéraires est un mode de transmission important, d’où les enterrements sécurisés.',
        source: 'OMS',
        date: null,
        stance: 'supports',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'established',
      vote: 'accurate',
      prosecution: {
        argument:
          'Je cherche une erreur : le message oppose Ebola à la grippe. L’OMS confirme que le mode de transmission est bien différent (pièce n° 1).',
        cited: [1],
      },
      defense: {
        argument:
          'L’affirmation reprend la fiche d’information de l’OMS (pièce n° 1) et la précision sur les rites funéraires la complète (pièce n° 2).',
        cited: [1, 2],
      },
      confirmed: [
        'Transmission par contact direct avec les liquides corporels ou des objets contaminés (pièce n° 1).',
        'Le contact avec les personnes décédées est un risque important (pièce n° 2).',
      ],
      contested: [],
      missing: [],
      conclusion:
        'L’information est établie. Ebola se transmet par contact direct avec le sang ou les liquides corporels, et non par l’air comme la grippe. Ne pas toucher les malades ni les corps explique la prévention.',
      whatToCheck: 'La fiche d’information de l’OMS, mise à jour à chaque épidémie.',
    },
  },
];
