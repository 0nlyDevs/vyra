import type { CertaintyLevel, ChangeType, EvidenceStance, Vote } from '@/lib/domain';
import type { cases, caseVersions, evidence, hearings, versionLinks } from '@/server/db/schema';

// Les affaires déjà instruites : de quoi remplir « Enquêtes » et « Tribunal » avec des dossiers
// complets, à tous les niveaux de certitude. Huit sont jugées (avec leur audience), deux sont
// ouvertes pour être jugées en direct. Comme le reste de la démo, tous les lieux, médias et
// organismes cités sont INVENTÉS.

type Version = { content: string; source: string; daysAgo: number; hour?: number };
type Link = {
  from: number;
  to: number;
  type: ChangeType;
  note: string;
  confidence: 'high' | 'medium' | 'low';
};
type Piece = {
  title: string;
  content: string;
  source: string;
  daysAgo: number;
  stance: EvidenceStance;
  strength: 'solid' | 'weak';
};
type Verdict = {
  certainty: CertaintyLevel;
  vote: Vote;
  prosecution: { argument: string; cited: number[] };
  defense: { argument: string; cited: number[] };
  confirmed: string[];
  contested: string[];
  missing: string[];
  conclusion: string;
  whatToCheck: string;
};
type ArchiveCase = {
  title: string;
  claim: string;
  kind: 'real' | 'fictional';
  createdDaysAgo: number;
  versions: Version[];
  links: Link[];
  evidence: Piece[];
  // Absent : l'affaire reste ouverte, à juger en direct.
  verdict?: Verdict;
};

const ARCHIVE: ArchiveCase[] = [
  {
    title: 'La vaccination à l’école',
    claim:
      'La mairie organise la vaccination gratuite des enfants dans les écoles du quartier du 3 au 7. Carnet de santé obligatoire.',
    kind: 'real',
    createdDaysAgo: 9,
    versions: [
      {
        content:
          'Campagne de vaccination gratuite des enfants de 5 à 12 ans dans les écoles publiques du quartier, du lundi 3 au vendredi 7. Se munir du carnet de santé.',
        source: 'Mairie d’Ambohitsoa (page officielle)',
        daysAgo: 9,
        hour: 9,
      },
      {
        content:
          'La mairie annonce une vaccination gratuite dans les écoles du quartier, du 3 au 7. Apportez le carnet de santé.',
        source: 'Radio des Collines',
        daysAgo: 8,
        hour: 12,
      },
      {
        content:
          'Vaccination gratuite des enfants dans les écoles du 3 au 7 ! Carnet de santé obligatoire. Partagez pour les parents.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 8,
        hour: 18,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'shared_unchanged',
        note: 'Mêmes dates, même gratuité, même carnet de santé.',
        confidence: 'high',
      },
      {
        from: 1,
        to: 2,
        type: 'tone_hardened',
        note: '« À apporter » devient « obligatoire » : une consigne devient une condition.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Avis de la mairie',
        content:
          'Vaccination gratuite des enfants de 5 à 12 ans, écoles publiques du quartier, du lundi 3 au vendredi 7.',
        source: 'Mairie d’Ambohitsoa',
        daysAgo: 9,
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'Confirmation du centre de santé',
        content:
          'Le centre de santé d’Ambohitsoa confirme les dates et la gratuité, et fournit les équipes.',
        source: 'Centre de santé d’Ambohitsoa',
        daysAgo: 8,
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'Reprise par la radio locale',
        content: 'La radio relaie l’avis de la mairie avec les mêmes dates.',
        source: 'Radio des Collines',
        daysAgo: 8,
        stance: 'supports',
        strength: 'weak',
      },
      {
        title: 'Rôle du carnet de santé',
        content:
          'Le carnet sert à consigner les doses ; un enfant sans carnet est vacciné et reçoit une fiche.',
        source: 'Centre de santé d’Ambohitsoa',
        daysAgo: 7,
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'established',
      vote: 'accurate',
      prosecution: {
        argument:
          'Une seule nuance : le message qui circule dit « carnet obligatoire », alors que l’avis demande seulement de l’apporter (pièces n° 1 et 4).',
        cited: [1, 4],
      },
      defense: {
        argument:
          'La campagne existe : la mairie et le centre de santé donnent les mêmes dates et la même gratuité (pièces n° 1 et 2). La radio les reprend (pièce n° 3).',
        cited: [1, 2, 3],
      },
      confirmed: [
        'Vaccination gratuite des enfants dans les écoles, du 3 au 7 (pièces n° 1 et 2).',
      ],
      contested: ['Le carnet « obligatoire » : il est demandé, pas exigé (pièce n° 4).'],
      missing: [],
      conclusion:
        'La campagne est réelle et les dates sont confirmées par la mairie et le centre de santé. Seule la mention « obligatoire » est exagérée : un enfant sans carnet est vacciné quand même.',
      whatToCheck: 'L’avis de la mairie : il donne les écoles concernées.',
    },
  },
  {
    title: 'Le pont fermé aux camions',
    claim:
      'Le pont de la route nationale du Nord est fermé aux camions depuis hier soir à cause d’une fissure.',
    kind: 'real',
    createdDaysAgo: 7,
    versions: [
      {
        content:
          'Restriction de circulation : le pont de la route nationale du Nord est interdit aux véhicules de plus de 3,5 tonnes jusqu’à nouvel ordre, pour le contrôle d’une fissure.',
        source: 'Direction régionale des routes (avis)',
        daysAgo: 7,
        hour: 10,
      },
      {
        content:
          'Camions interdits sur le pont de la route nationale du Nord : une fissure relevée, contrôle en cours.',
        source: 'Le Courrier de la Côte (journal local)',
        daysAgo: 7,
        hour: 15,
      },
      {
        content:
          'Le pont est fermé aux camions depuis hier soir, il y a une fissure ! Évitez la route.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 6,
        hour: 8,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'shared_unchanged',
        note: 'La restriction, la fissure et le contrôle sont repris tels quels.',
        confidence: 'high',
      },
      {
        from: 1,
        to: 2,
        type: 'related',
        note: '« Depuis hier soir » apparaît : l’avis ne donne aucune heure de début.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Avis de la direction des routes',
        content:
          'Interdiction aux véhicules de plus de 3,5 tonnes, jusqu’à nouvel ordre, pour le contrôle d’une fissure.',
        source: 'Direction régionale des routes',
        daysAgo: 7,
        stance: 'supports',
        strength: 'solid',
      },
      {
        title: 'Reportage sur place',
        content:
          'Une file de camions attend à l’entrée du pont, une signalisation de chantier est posée.',
        source: 'Radio des Collines',
        daysAgo: 7,
        stance: 'supports',
        strength: 'weak',
      },
      {
        title: 'Ce que l’avis ne dit pas',
        content:
          'L’avis ne donne ni la date de début de la restriction ni sa durée, et ne parle pas de fermeture totale.',
        source: 'Direction régionale des routes',
        daysAgo: 7,
        stance: 'context',
        strength: 'solid',
      },
    ],
    verdict: {
      certainty: 'probable',
      vote: 'accurate',
      prosecution: {
        argument:
          'Le message dit « fermé » et « depuis hier soir ». L’avis parle d’une restriction pour les plus de 3,5 tonnes, sans date de début (pièce n° 3).',
        cited: [1, 3],
      },
      defense: {
        argument:
          'L’essentiel est exact : les camions sont interdits à cause d’une fissure (pièce n° 1), ce que le reportage constate sur place (pièce n° 2).',
        cited: [1, 2],
      },
      confirmed: ['Les camions sont interdits sur le pont pour une fissure (pièces n° 1 et 2).'],
      contested: [
        '« Fermé » : seuls les véhicules de plus de 3,5 tonnes sont concernés (pièce n° 1).',
      ],
      missing: ['La date exacte de début de la restriction.'],
      conclusion:
        'La restriction aux camions est probable et confirmée par l’autorité. Le mot « fermé » et l’heure « hier soir » ne sont pas établis : les voitures peuvent passer.',
      whatToCheck:
        'La date de début, qu’un nouvel avis de la direction des routes devrait préciser.',
    },
  },
  {
    title: 'L’eau des puits contaminée',
    claim: 'L’eau des puits de Mahavoky-Sud est contaminée par le choléra : ne la buvez plus !',
    kind: 'real',
    createdDaysAgo: 6,
    versions: [
      {
        content:
          'Quelques cas de diarrhée relevés cette semaine à Mahavoky-Sud. Par précaution, faites bouillir l’eau des puits avant de la boire.',
        source: 'Centre de santé de Mahavoky',
        daysAgo: 6,
        hour: 9,
      },
      {
        content: 'Eau des puits contaminée à Mahavoky-Sud, il y a le choléra ! Ne buvez plus !',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 5,
        hour: 7,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: '« Par précaution » devient « contaminée », et « quelques cas de diarrhée » devient « le choléra ».',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Conseil du centre de santé',
        content:
          'Quelques cas de diarrhée signalés ; le centre recommande de faire bouillir l’eau des puits par précaution.',
        source: 'Centre de santé de Mahavoky',
        daysAgo: 6,
        stance: 'context',
        strength: 'solid',
      },
      {
        title: 'Le mot « choléra »',
        content: 'Le centre de santé ne mentionne le choléra dans aucun de ses communiqués.',
        source: 'Centre de santé de Mahavoky',
        daysAgo: 6,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Aucune analyse publiée',
        content: 'Aucune analyse de l’eau des puits n’a été publiée à ce jour.',
        source: 'Direction régionale de la santé',
        daysAgo: 5,
        stance: 'context',
        strength: 'solid',
      },
      {
        title: 'Témoignage d’un habitant',
        content:
          'Un habitant dit avoir eu des diarrhées après avoir bu l’eau d’un puits, sans précision de date ni de cause.',
        source: 'Radio des Collines',
        daysAgo: 5,
        stance: 'supports',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'uncertain',
      vote: 'unsure',
      prosecution: {
        argument:
          'Le message affirme une contamination et un choléra. Le centre ne parle ni de l’un ni de l’autre : il parle de quelques diarrhées et d’une précaution (pièces n° 1 et 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Il y a bien un risque sanitaire local : des cas sont signalés et le centre conseille de faire bouillir l’eau (pièce n° 1). Un habitant témoigne (pièce n° 4).',
        cited: [1, 4],
      },
      confirmed: ['Quelques cas de diarrhée et un conseil de faire bouillir l’eau (pièce n° 1).'],
      contested: ['Le choléra : jamais mentionné par le centre (pièce n° 2).'],
      missing: ['Une analyse de l’eau des puits.', 'Le nombre exact de cas et leur cause.'],
      conclusion:
        'On ne peut pas conclure. La précaution est justifiée, mais ni la contamination ni le choléra ne sont établis : aucune analyse n’a été publiée.',
      whatToCheck: 'Les résultats d’analyse de l’eau, quand la direction de la santé les publiera.',
    },
  },
  {
    title: 'Le riz à 300 000 Ar le sac',
    claim: 'Le sac de riz passera à 300 000 Ar dès lundi : il faut tout acheter maintenant.',
    kind: 'real',
    createdDaysAgo: 5,
    versions: [
      {
        content:
          'Le prix moyen du sac de riz de 50 kg est de 145 000 Ar ce mois-ci, stable depuis deux mois.',
        source: 'Observatoire des prix (bulletin)',
        daysAgo: 8,
        hour: 8,
      },
      {
        content: 'Le sac de riz passe à 300 000 Ar lundi ! Stockez tout de suite.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 5,
        hour: 7,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'contradicts',
        note: 'Le prix annoncé est plus du double du prix relevé, sans aucune source.',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Bulletin des prix',
        content:
          'Sac de 50 kg à 145 000 Ar en moyenne, stable depuis deux mois, aucune hausse annoncée.',
        source: 'Observatoire des prix',
        daysAgo: 8,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Démenti des commerçants',
        content: 'L’association des commerçants du marché dit n’avoir annoncé aucune hausse.',
        source: 'Association des commerçants du marché',
        daysAgo: 4,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Effet de panique',
        content:
          'Quand une rumeur de hausse circule, des acheteurs stockent et des prix montent localement pour quelques jours.',
        source: 'Observatoire des prix',
        daysAgo: 4,
        stance: 'context',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Aucune source ne vient avec ce prix. Le bulletin donne 145 000 Ar, stable (pièce n° 1), et les commerçants démentent (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce qui soutienne la hausse. Je note seulement que la rumeur peut elle-même faire monter les prix (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: [
        '300 000 Ar le sac : 145 000 Ar relevés, stables (pièce n° 1).',
        'Une hausse lundi : démentie par les commerçants (pièce n° 2).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite : aucune hausse n’est annoncée et le prix relevé est moins de la moitié de celui qui circule. Le message pousse à acheter dans la panique.',
      whatToCheck: 'Le bulletin de l’observatoire des prix, publié chaque mois.',
    },
  },
  {
    title: 'L’aide de 150 000 Ar du « ministère »',
    claim:
      'Ministère de l’Économie : vous avez gagné une aide de 150 000 Ar. Envoyez votre code mobile money pour la recevoir.',
    kind: 'real',
    createdDaysAgo: 4,
    versions: [
      {
        content:
          'Ministère de l’Économie : vous avez gagné une aide de 150 000 Ar. Envoyez votre code mobile money pour la recevoir.',
        source: 'Message en chaîne (messagerie)',
        daysAgo: 4,
        hour: 14,
      },
      {
        content:
          'Aide de l’État : 150 000 Ar pour chaque famille. Envoyez votre code mobile money au 034 00 099 99.',
        source: 'Message en chaîne (messagerie)',
        daysAgo: 3,
        hour: 9,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'related',
        note: 'Même arnaque, autre habillage : un numéro de téléphone remplace la formule « vous avez gagné ».',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Mise en garde du ministère',
        content:
          'Le ministère rappelle qu’il ne demande jamais de code mobile money ni de frais pour une aide.',
        source: 'Ministère de l’Économie (communiqué)',
        daysAgo: 3,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Le numéro cité',
        content: 'Le 034 00 099 99 n’apparaît dans aucun annuaire officiel d’un service public.',
        source: 'Annuaire officiel',
        daysAgo: 3,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Même schéma signalé',
        content:
          'L’opérateur signale le même type de message depuis une semaine, avec des numéros différents.',
        source: 'Opérateur Mada-Net (alerte)',
        daysAgo: 2,
        stance: 'context',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'Un vrai ministère ne demande jamais de code mobile money (pièce n° 1). Le numéro cité n’appartient à aucun service public (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce pour défendre ce message. L’opérateur signale d’ailleurs le même schéma (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: [
        'Une aide de l’État contre un code mobile money : le ministère dément ce procédé (pièce n° 1).',
      ],
      missing: [],
      conclusion:
        'C’est une arnaque. Aucune aide n’existe, et donner son code mobile money permet à l’escroc de vider le compte. Ne rien envoyer, ne pas transférer le message.',
      whatToCheck: 'Le numéro dans l’annuaire officiel, et la mise en garde du ministère.',
    },
  },
  {
    title: 'Le requin dans le port',
    claim:
      'Un requin de 6 mètres filmé dans le port ce matin : la baignade est interdite sur toute la côte.',
    kind: 'real',
    createdDaysAgo: 3,
    versions: [
      {
        content:
          'Requin de 6 mètres dans le port ce matin ! Baignade interdite sur toute la côte. (vidéo)',
        source: 'Océan Alerte (page de réseau social)',
        daysAgo: 3,
        hour: 7,
      },
      {
        content:
          'Un requin aurait été filmé dans le port ; la baignade serait interdite sur la côte.',
        source: 'Radio des Collines',
        daysAgo: 3,
        hour: 12,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'related',
        note: 'La radio reprend l’information au conditionnel, sans la vérifier.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Examen du fichier vidéo',
        content:
          'Le fichier déclare lui-même un outil de génération d’images ; aucune information d’appareil ni de date de prise de vue.',
        source: 'Examen automatique du fichier',
        daysAgo: 2,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Démenti de la capitainerie',
        content: 'Aucun requin signalé dans le port ; la baignade est ouverte sur toute la côte.',
        source: 'Capitainerie du port',
        daysAgo: 2,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Même séquence ailleurs',
        content: 'Une séquence identique circule depuis 2023 avec une autre légende.',
        source: 'Vérification d’images',
        daysAgo: 2,
        stance: 'contradicts',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'La vidéo déclare un outil de génération d’images (pièce n° 1) et la capitainerie dément toute présence de requin (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'La radio rapporte l’information au conditionnel, ce qui est prudent, mais elle ne vérifie rien. Je n’ai aucune pièce en faveur du requin.',
        cited: [],
      },
      confirmed: [],
      contested: [
        'Un requin dans le port : démenti par la capitainerie (pièce n° 2).',
        'La vidéo : signature d’image générée (pièce n° 1).',
      ],
      missing: [],
      conclusion:
        'L’information est contredite. La vidéo est générée et la baignade n’est pas interdite. Aucun marqueur ne prouve à lui seul qu’une image est fausse, mais ici le démenti officiel s’y ajoute.',
      whatToCheck: 'L’examen du fichier dans le module Scan, et l’avis de la capitainerie.',
    },
  },
  {
    title: 'La cantine détournée',
    claim: 'Le directeur de l’école d’Ambohitsoa-Sud détourne l’argent de la cantine depuis un an.',
    kind: 'real',
    createdDaysAgo: 2,
    versions: [
      {
        content:
          'Le directeur détourne l’argent de la cantine ! Les enfants mangent du riz sans sauce.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 5,
        hour: 18,
      },
      {
        content:
          'Scandale à l’école : le directeur a pris l’argent de la cantine depuis un an. Partagez.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 3,
        hour: 8,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: 'L’accusation gagne une durée, « depuis un an », sans aucune source.',
        confidence: 'medium',
      },
    ],
    evidence: [
      {
        title: 'Pas d’audit publié',
        content: 'Aucun audit de la cantine de l’école n’a été publié.',
        source: 'Direction de l’éducation',
        daysAgo: 2,
        stance: 'context',
        strength: 'solid',
      },
      {
        title: 'Aucune plainte',
        content: 'Le comité des parents n’a déposé aucune plainte et n’a pas demandé de contrôle.',
        source: 'Comité des parents d’élèves',
        daysAgo: 2,
        stance: 'context',
        strength: 'solid',
      },
      {
        title: 'Photo d’un repas',
        content:
          'Une photo d’un repas sans sauce circule, sans date, sans lieu ni lien avec l’école citée.',
        source: 'Infos Quartier 24',
        daysAgo: 5,
        stance: 'supports',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'insufficient',
      vote: 'unsure',
      prosecution: {
        argument:
          'L’accusation vise une personne nommée sans aucune pièce : ni audit, ni plainte, ni chiffre (pièces n° 1 et 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'La photo d’un repas sans sauce (pièce n° 3) peut inquiéter des parents, mais elle ne prouve ni le lieu ni un détournement.',
        cited: [3],
      },
      confirmed: [],
      contested: [],
      missing: [
        'Un audit de la cantine.',
        'Une plainte ou un signalement officiel.',
        'Une preuve que la photo vient de cette école.',
      ],
      conclusion:
        'Les informations sont insuffisantes pour conclure. Accuser une personne sans preuve peut lui nuire : il vaut mieux ne pas relayer l’accusation et demander un contrôle par les voies officielles.',
      whatToCheck: 'Une demande d’audit auprès de la direction de l’éducation.',
    },
  },
  {
    title: 'Le couvre-feu à 20 h',
    claim:
      'Couvre-feu dès ce soir à 20 h dans toute la région : la police arrête ceux qui sortent.',
    kind: 'real',
    createdDaysAgo: 1,
    versions: [
      {
        content:
          'Attention, couvre-feu dès ce soir à 20 h dans toute la région. La police arrête ceux qui sortent. Prévenez vos proches.',
        source: 'Message vocal en chaîne (messagerie)',
        daysAgo: 2,
        hour: 17,
      },
      {
        content: 'COUVRE-FEU À 20 H !! Police partout !! Restez chez vous et partagez !!',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 2,
        hour: 19,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: 'Le ton passe à des majuscules et à des points d’exclamation, sans nouvelle information.',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Démenti de la préfecture',
        content:
          'Aucun couvre-feu n’a été décidé. La circulation est normale dans toute la région.',
        source: 'Préfecture (communiqué)',
        daysAgo: 2,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Circulation normale',
        content: 'La radio décrit une circulation normale en soirée et des commerces ouverts.',
        source: 'Radio des Collines',
        daysAgo: 1,
        stance: 'contradicts',
        strength: 'weak',
      },
      {
        title: 'Une rumeur qui revient',
        content:
          'Le même vocal a circulé dans une autre région il y a quelques années, avec une autre heure.',
        source: 'Vérification d’archives',
        daysAgo: 1,
        stance: 'context',
        strength: 'weak',
      },
    ],
    verdict: {
      certainty: 'contradicted',
      vote: 'misleading',
      prosecution: {
        argument:
          'La préfecture dément tout couvre-feu (pièce n° 1) et la radio décrit une soirée normale (pièce n° 2).',
        cited: [1, 2],
      },
      defense: {
        argument:
          'Je n’ai aucune pièce qui annonce un couvre-feu. Le vocal ressemble à une rumeur plus ancienne (pièce n° 3).',
        cited: [3],
      },
      confirmed: [],
      contested: ['Un couvre-feu dès 20 h : démenti par la préfecture (pièce n° 1).'],
      missing: [],
      conclusion:
        'L’information est contredite par la préfecture. C’est une rumeur de panique qui revient régulièrement : ne pas la transférer.',
      whatToCheck: 'Le communiqué de la préfecture.',
    },
  },
  {
    title: 'Le réseau mobile coupé trois jours',
    claim: 'Le réseau mobile sera coupé pendant trois jours dans toute la région pour des travaux.',
    kind: 'real',
    createdDaysAgo: 0,
    versions: [
      {
        content:
          'Maintenance programmée samedi de 1 h à 5 h sur une partie du réseau de la région. Des coupures brèves sont possibles.',
        source: 'Opérateur Mada-Net (avis)',
        daysAgo: 2,
        hour: 11,
      },
      {
        content:
          'Réseau coupé 3 jours dans toute la région pour des travaux ! Prévenez tout le monde.',
        source: 'Infos Quartier 24 (page de réseau social)',
        daysAgo: 1,
        hour: 9,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'figure_changed',
        note: 'Quatre heures de maintenance deviennent trois jours, et « une partie du réseau » devient « toute la région ».',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Avis de maintenance',
        content:
          'Maintenance samedi de 1 h à 5 h, sur une partie du réseau, avec de possibles coupures brèves.',
        source: 'Opérateur Mada-Net',
        daysAgo: 2,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Aucune autre annonce',
        content:
          'Aucun autre opérateur ni aucune autorité n’annonce de coupure de plusieurs jours.',
        source: 'Autorité de régulation',
        daysAgo: 1,
        stance: 'context',
        strength: 'weak',
      },
    ],
  },
  {
    title: 'La bourse d’études à 2 000 000 Ar',
    claim:
      'Une bourse d’études de 2 000 000 Ar est offerte à tous les lycéens qui envoient leurs coordonnées.',
    kind: 'real',
    createdDaysAgo: 0,
    versions: [
      {
        content:
          'Bourse d’études de 2 000 000 Ar pour tous les lycéens ! Envoyez votre nom, votre numéro et votre photo de carte d’identité.',
        source: 'Bourses Mada (page de réseau social)',
        daysAgo: 3,
        hour: 16,
      },
      {
        content:
          'Dernière chance : la bourse de 2 000 000 Ar se ferme ce soir. Envoyez vos coordonnées maintenant.',
        source: 'Bourses Mada (page de réseau social)',
        daysAgo: 1,
        hour: 8,
      },
    ],
    links: [
      {
        from: 0,
        to: 1,
        type: 'tone_hardened',
        note: 'Une urgence artificielle apparaît : « se ferme ce soir ».',
        confidence: 'high',
      },
    ],
    evidence: [
      {
        title: 'Aucune bourse de ce montant',
        content:
          'Le catalogue officiel des bourses ne contient aucune aide de 2 000 000 Ar ouverte à tous.',
        source: 'Ministère de l’Éducation (catalogue)',
        daysAgo: 1,
        stance: 'contradicts',
        strength: 'solid',
      },
      {
        title: 'Données demandées',
        content:
          'La page demande une photo de carte d’identité : aucun organisme officiel ne demande cela par message.',
        source: 'Analyse du message',
        daysAgo: 1,
        stance: 'context',
        strength: 'weak',
      },
    ],
  },
];

// Les lignes à insérer, avec des identifiants stables (une adresse de démo reste valable après une
// remise à zéro). `id` : le même générateur que seed-data.ts.
const at = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export function archiveRows(id: (n: number) => string, reviewerId: string) {
  const caseRows: (typeof cases.$inferInsert)[] = [];
  const versionRows: (typeof caseVersions.$inferInsert)[] = [];
  const linkRows: (typeof versionLinks.$inferInsert)[] = [];
  const evidenceRows: (typeof evidence.$inferInsert)[] = [];
  const hearingRows: (typeof hearings.$inferInsert)[] = [];

  ARCHIVE.forEach((item, index) => {
    const caseId = id(20 + index);
    const versionId = (position: number) => id(2000 + index * 10 + position);
    caseRows.push({
      id: caseId,
      title: item.title,
      claim: item.claim,
      kind: item.kind,
      status: item.verdict ? 'concluded' : 'open',
      certainty: item.verdict?.certainty ?? null,
      conclusion: item.verdict?.conclusion ?? null,
      createdAt: at(item.createdDaysAgo, 8),
    });
    item.versions.forEach((version, position) => {
      versionRows.push({
        id: versionId(position),
        caseId,
        position: position + 1,
        content: version.content,
        sourceName: version.source,
        publishedAt: at(version.daysAgo, version.hour ?? 9),
      });
    });
    for (const link of item.links) {
      linkRows.push({
        caseId,
        fromVersionId: versionId(link.from),
        toVersionId: versionId(link.to),
        changeType: link.type,
        note: link.note,
        confidence: link.confidence,
      });
    }
    item.evidence.forEach((piece, position) => {
      evidenceRows.push({
        caseId,
        number: position + 1,
        title: piece.title,
        content: piece.content,
        sourceName: piece.source,
        publishedAt: at(piece.daysAgo, 10),
        stance: piece.stance,
        strength: piece.strength,
      });
    });
    if (item.verdict) {
      const verdict = item.verdict;
      hearingRows.push({
        caseId,
        profileId: reviewerId,
        status: 'concluded',
        prosecution: verdict.prosecution,
        defense: verdict.defense,
        pleadingsSource: 'fallback',
        vote: verdict.vote,
        certainty: verdict.certainty,
        findings: {
          confirmed: verdict.confirmed,
          contested: verdict.contested,
          missing: verdict.missing,
        },
        conclusion: verdict.conclusion,
        whatToCheck: verdict.whatToCheck,
        verdictSource: 'fallback',
        concludedAt: at(Math.max(item.createdDaysAgo - 1, 0), 20),
      });
    }
  });
  return { caseRows, versionRows, linkRows, evidenceRows, hearingRows };
}

export const ARCHIVE_COUNT = ARCHIVE.length;
