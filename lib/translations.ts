export const translations = {
  en: {
    // Common
    loading: 'Loading…',
    invitationNotFound: 'Invitation not found',
    checkLink: 'Please check your invitation link.',

    // Invite nav
    navAbout: 'About',
    navLocation: 'Location',
    navSchedule: 'The Schedule',
    navStay: 'Where to stay',
    navRegistry: 'Gift Registry',
    navFaq: 'FAQ',
    navRsvp: 'RSVP',

    // Invite hero
    rsvpNow: 'RSVP Now',
    weddingDate: 'Saturday 3 October 2026',

    // Invite about
    aboutLabel: 'A note from us',
    aboutText: 'We\'re getting married — and we can\'t wait to celebrate with you. Everything you need is on this page: the schedule, where we\'re celebrating, where to stay, and how to RSVP. So excited to share this day with you both.',

    // Invite venue
    locationLabel: 'Location',
    venueName: 'La Garriga de Castelladral.',
    venueAddress: 'La Garriga de Castelladral',
    venueCity: 'Barcelona, Spain',
    venueAddressLabel: '• Address',
    venueMapsLink: 'Google Maps Directions',
    venueCarLabel: '• By Car',
    venueCarText: 'Parking details TBC.',
    venueBusLabel: '• By Bus',
    venueBusText: 'We\'re arranging a bus from the city centre. Let us know in your RSVP if you\'d like a seat.',

    // Invite schedule
    scheduleLabel: 'The Schedule',
    scheduleIntro: 'We would love for you to join us as we celebrate our wedding. Good food, familiar faces, and a few stories worth retelling.',
    eventComingSoon: 'Event details coming soon.',

    // Invite accommodation
    stayLabel: 'Where to stay',
    hotelsTitle: 'Hotels & accommodation',
    bookNow: 'Book now →',
    venueStayTitle: 'Accommodation is on us!',
    venueStayText: 'We\'ve invited a special few guests to stay in the venue from Friday to Monday, and you\'re one of them. Let us know in the RSVP form what you think.',
    checkIn: '• Check-in',
    checkInDetail: 'From 3pm on Friday 2 October',
    checkOut: '• Check-out',
    checkOutDetail: 'By 11am on Monday 5 October',
    breakfast: '• Breakfast',
    breakfastDetail: 'Included both mornings',

    // Invite registry
    registryLabel: 'Gift Registry',
    registryTitle: 'Sharing our wedding day with you is what matters most to us.',
    registryText: 'If you would like to give a gift, a contribution towards our honeymoon would be greatly appreciated.',
    honeymoonFund: 'View Honeymoon Fund →',

    // Invite FAQ
    faqLabel: 'FAQ',
    faqIntro: 'Good to know.',
    faqComingSoon: 'FAQ coming soon.',
    anyOtherQuestions: 'Any other questions?',

    // Invite RSVP CTA
    rsvpDeadline: 'Kindly reply by 1 May 2026',
    rsvpQuestion: 'Please let us know if you\'ll be joining us.',
    rsvpVenue: 'La Garriga de Castelladral · Saturday 3 October 2026',
    rsvpButton: 'RSVP now →',
    backToTop: 'Back to top ↑',
    rsvpLabel: 'RSVP',
    rsvpGreeting: (name?: string) => name ? `${name},` : 'Let us know',
    rsvpQuestionInvite: 'will you be joining us?',
    attending: "I'll be there",
    notAttending: "Can't make it",
    stayingWithUs: 'Staying with us',
    stayDescription: "You've been invited to stay at the venue — let us know if any nights don't work.",
    dietaryRequirements: 'Dietary requirements',
    dietarySelectAll: 'Select all that apply.',
    dietaryPlaceholder: 'Anything else we should know…',
    dietaryError: 'Please select at least one option, including "No requirements" if none apply.',
    plusOneTitle: 'Bringing a +1?',
    plusOneDescription: "Let us know and we'll send them an invitation.",
    plusOneCheckbox: "Yes, I'm bringing a +1",
    plusOneName: 'Their name',
    plusOneEmail: 'Their email (optional)',
    anythingElse: 'Anything else?',
    anythingElseDescription: "Accessibility needs, questions, or anything you'd like us to know.",
    notesPlaceholder: 'Let us know…',
    dietaryErrorMessage: 'Please select your dietary requirements above.',
    eventsErrorMessage: 'Please respond to all events above to continue.',
    submitting: 'Sending…',
    submitButton: 'Send my RSVP',
    anyQuestions: 'Any questions?',
    dietaryOptions: [
      { id: 'none', label: 'No requirements' },
      { id: 'vegetarian', label: 'Vegetarian' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'gluten_free', label: 'Gluten-free' },
      { id: 'dairy_free', label: 'Dairy-free' },
      { id: 'nut_allergy', label: 'Nut allergy' },
      { id: 'shellfish_allergy', label: 'Shellfish allergy' },
      { id: 'halal', label: 'Halal' },
      { id: 'kosher', label: 'Kosher' },
    ],
    nights: [
      { key: 'thursday_night', label: 'Thursday night' },
      { key: 'friday_night', label: 'Friday night' },
      { key: 'saturday_night', label: 'Saturday night' },
    ],
  },
  pt: {
    // Common
    loading: 'Carregando…',
    invitationNotFound: 'Convite não encontrado',
    checkLink: 'Por favor, verifique o seu link de convite.',

    // Invite nav
    navAbout: 'Sobre',
    navLocation: 'Local',
    navSchedule: 'Cronograma',
    navStay: 'Onde ficar',
    navRegistry: 'Lista de presentes',
    navFaq: 'Perguntas frequentes',
    navRsvp: 'RSVP',

    // Invite hero
    rsvpNow: 'RSVP Agora',
    weddingDate: 'Sábado, 3 de outubro de 2026',

    // Invite about
    aboutLabel: 'Uma nota nossa',
    aboutText: 'Vamos casar — e mal podemos esperar para celebrar convosco. Tudo o que precisas está nesta página: o cronograma, o local onde vamos celebrar, onde ficar e como responder. Muito entusiasmados em partilhar este dia convosco.',

    // Invite venue
    locationLabel: 'Local',
    venueName: 'La Garriga de Castelladral.',
    venueAddress: 'La Garriga de Castelladral',
    venueCity: 'Barcelona, Espanha',
    venueAddressLabel: '• Morada',
    venueMapsLink: 'Indicações no Google Maps',
    venueCarLabel: '• De carro',
    venueCarText: 'Detalhes de estacionamento serão confirmados.',
    venueBusLabel: '• De autocarro',
    venueBusText: 'Estamos a organizar um autocarro do centro da cidade. Avisa-nos no RSVP se quiseres um lugar.',

    // Invite schedule
    scheduleLabel: 'Cronograma',
    scheduleIntro: 'Adorávamos que nos acompanhasses enquanto celebramos o nosso casamento. Boa comida, faces familiares e algumas histórias que merecem ser contadas novamente.',
    eventComingSoon: 'Detalhes dos eventos em breve.',

    // Invite accommodation
    stayLabel: 'Onde ficar',
    hotelsTitle: 'Hotéis e alojamento',
    bookNow: 'Reservar agora →',
    venueStayTitle: 'O alojamento é por nossa conta!',
    venueStayText: 'Convidámos alguns convidados especiais para ficarem no venue de sexta a segunda-feira, e tu és um deles. Avisa-nos no formulário RSVP o que achas.',
    checkIn: '• Check-in',
    checkInDetail: 'A partir das 15h de sexta-feira, 2 de outubro',
    checkOut: '• Check-out',
    checkOutDetail: 'Até às 11h de segunda-feira, 5 de outubro',
    breakfast: '• Pequeno-almoço',
    breakfastDetail: 'Incluído ambas as manhãs',

    // Invite registry
    registryLabel: 'Lista de Presentes',
    registryTitle: 'Partilhar o nosso dia de casamento contigo é o que mais nos importa.',
    registryText: 'Se quiseres oferecer um presente, uma contribuição para a nossa lua de mel seria muito apreciada.',
    honeymoonFund: 'Ver Fundo de Lua de Mel →',

    // Invite FAQ
    faqLabel: 'Perguntas Frequentes',
    faqIntro: 'Bom saber.',
    faqComingSoon: 'Perguntas frequentes em breve.',
    anyOtherQuestions: 'Outras dúvidas?',

    // Invite RSVP CTA
    rsvpDeadline: 'Por favor, responde até 1 de maio de 2026',
    rsvpQuestion: 'Por favor, avisa-nos se vais estar connosco.',
    rsvpVenue: 'La Garriga de Castelladral · Sábado, 3 de outubro de 2026',
    rsvpButton: 'RSVP agora →',
    backToTop: 'Voltar ao topo ↑',
    rsvpLabel: 'RSVP',
    rsvpGreeting: (name?: string) => name ? `${name},` : 'Queremos saber',
    rsvpQuestionInvite: 'vais poder estar presente?',
    attending: 'Sim, vou estar lá',
    notAttending: 'Infelizmente, não posso',
    stayingWithUs: 'Ficando connosco',
    stayDescription: 'Foste convidado/a para ficar no venue — avisa-nos se alguma noite não te fica bem.',
    dietaryRequirements: 'Requisitos alimentares',
    dietarySelectAll: 'Seleciona tudo o que se aplica.',
    dietaryPlaceholder: 'Há algo mais que devíamos saber…',
    dietaryError: 'Por favor, seleciona pelo menos uma opção, incluindo "Sem requisitos" se nenhuma se aplica.',
    plusOneTitle: 'Vais trazer um acompanhante?',
    plusOneDescription: 'Avisa-nos e enviaremos um convite para a outra pessoa.',
    plusOneCheckbox: 'Sim, vou trazer um acompanhante',
    plusOneName: 'Nome da pessoa',
    plusOneEmail: 'Email (opcional)',
    anythingElse: 'Há algo mais?',
    anythingElseDescription: 'Necessidades de acessibilidade, dúvidas, ou algo que devíamos saber.',
    notesPlaceholder: 'Avisa-nos…',
    dietaryErrorMessage: 'Por favor, seleciona os teus requisitos alimentares acima.',
    eventsErrorMessage: 'Por favor, responde a todos os eventos acima para continuar.',
    submitting: 'A enviar…',
    submitButton: 'Enviar o meu RSVP',
    anyQuestions: 'Tens dúvidas?',
    dietaryOptions: [
      { id: 'none', label: 'Sem requisitos' },
      { id: 'vegetarian', label: 'Vegetariano' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'gluten_free', label: 'Sem glúten' },
      { id: 'dairy_free', label: 'Sem lacticínios' },
      { id: 'nut_allergy', label: 'Alergia a frutos secos' },
      { id: 'shellfish_allergy', label: 'Alergia a marisco' },
      { id: 'halal', label: 'Halal' },
      { id: 'kosher', label: 'Kosher' },
    ],
    nights: [
      { key: 'thursday_night', label: 'Quinta-feira à noite' },
      { key: 'friday_night', label: 'Sexta-feira à noite' },
      { key: 'saturday_night', label: 'Sábado à noite' },
    ],
  },
  es: {
    // Common
    loading: 'Cargando…',
    invitationNotFound: 'Invitación no encontrada',
    checkLink: 'Por favor, verifica tu enlace de invitación.',

    // Invite nav
    navAbout: 'Acerca de',
    navLocation: 'Ubicación',
    navSchedule: 'Cronograma',
    navStay: 'Dónde alojarse',
    navRegistry: 'Lista de bodas',
    navFaq: 'Preguntas frecuentes',
    navRsvp: 'RSVP',

    // Invite hero
    rsvpNow: 'RSVP Ahora',
    weddingDate: 'Sábado, 3 de octubre de 2026',

    // Invite about
    aboutLabel: 'Una nota de nosotros',
    aboutText: 'Nos casamos — y no podemos esperar para celebrar contigo. Todo lo que necesitas está en esta página: el cronograma, dónde celebramos, dónde alojarse y cómo RSVP. Muy emocionados de compartir este día contigo.',

    // Invite venue
    locationLabel: 'Ubicación',
    venueName: 'La Garriga de Castelladral.',
    venueAddress: 'La Garriga de Castelladral',
    venueCity: 'Barcelona, España',
    venueAddressLabel: '• Dirección',
    venueMapsLink: 'Indicaciones en Google Maps',
    venueCarLabel: '• En coche',
    venueCarText: 'Los detalles del aparcamiento se confirmarán.',
    venueBusLabel: '• En autobús',
    venueBusText: 'Estamos organizando un autobús desde el centro de la ciudad. Avísanos en tu RSVP si deseas un asiento.',

    // Invite schedule
    scheduleLabel: 'Cronograma',
    scheduleIntro: 'Nos encantaría que nos acompañes mientras celebramos nuestra boda. Buena comida, caras familiares y algunas historias que vale la pena contar de nuevo.',
    eventComingSoon: 'Detalles del evento próximamente.',

    // Invite accommodation
    stayLabel: 'Dónde alojarse',
    hotelsTitle: 'Hoteles y alojamiento',
    bookNow: 'Reservar ahora →',
    venueStayTitle: '¡El alojamiento corre por nuestra cuenta!',
    venueStayText: 'Hemos invitado a algunos invitados especiales a quedarse en el venue de viernes a lunes, y tú eres uno de ellos. Avísanos en el formulario RSVP qué opinas.',
    checkIn: '• Check-in',
    checkInDetail: 'A partir de las 15h del viernes, 2 de octubre',
    checkOut: '• Check-out',
    checkOutDetail: 'Antes de las 11h del lunes, 5 de octubre',
    breakfast: '• Desayuno',
    breakfastDetail: 'Incluido ambas mañanas',

    // Invite registry
    registryLabel: 'Lista de Bodas',
    registryTitle: 'Compartir nuestro día de boda contigo es lo más importante para nosotros.',
    registryText: 'Si deseas hacer un regalo, una contribución hacia nuestra luna de miel sería muy apreciada.',
    honeymoonFund: 'Ver Fondo de Luna de Miel →',

    // Invite FAQ
    faqLabel: 'Preguntas frecuentes',
    faqIntro: 'Bueno saber.',
    faqComingSoon: 'Preguntas frecuentes próximamente.',
    anyOtherQuestions: '¿Otras preguntas?',

    // Invite RSVP CTA
    rsvpDeadline: 'Por favor, responde antes del 1 de mayo de 2026',
    rsvpQuestion: 'Por favor, avísanos si asistirás.',
    rsvpVenue: 'La Garriga de Castelladral · Sábado, 3 de octubre de 2026',
    rsvpButton: 'RSVP ahora →',
    backToTop: 'Volver al inicio ↑',
    rsvpLabel: 'RSVP',
    rsvpGreeting: (name?: string) => name ? `${name},` : 'Queremos saber',
    rsvpQuestionInvite: '¿podrás acompañarnos?',
    attending: 'Sí, estaré allí',
    notAttending: 'Lamentablemente, no puedo',
    stayingWithUs: 'Alojándote con nosotros',
    stayDescription: 'Has sido invitado/a a quedarte en el venue — avísanos si alguna noche no te va bien.',
    dietaryRequirements: 'Requisitos dietéticos',
    dietarySelectAll: 'Selecciona todo lo que aplique.',
    dietaryPlaceholder: '¿Hay algo más que deberíamos saber…?',
    dietaryError: 'Por favor, selecciona al menos una opción, incluyendo "Sin requisitos" si no aplica ninguna.',
    plusOneTitle: '¿Vas a traer un acompañante?',
    plusOneDescription: 'Avísanos y enviaremos una invitación para la otra persona.',
    plusOneCheckbox: 'Sí, voy a traer un acompañante',
    plusOneName: 'Nombre de la persona',
    plusOneEmail: 'Email (opcional)',
    anythingElse: '¿Algo más?',
    anythingElseDescription: 'Necesidades de accesibilidad, preguntas, o cualquier cosa que deberíamos saber.',
    notesPlaceholder: 'Avísanos…',
    dietaryErrorMessage: 'Por favor, selecciona tus requisitos dietéticos arriba.',
    eventsErrorMessage: 'Por favor, responde a todos los eventos arriba para continuar.',
    submitting: 'Enviando…',
    submitButton: 'Enviar mi RSVP',
    anyQuestions: '¿Tienes preguntas?',
    dietaryOptions: [
      { id: 'none', label: 'Sin requisitos' },
      { id: 'vegetarian', label: 'Vegetariano' },
      { id: 'vegan', label: 'Vegano' },
      { id: 'gluten_free', label: 'Sin gluten' },
      { id: 'dairy_free', label: 'Sin productos lácteos' },
      { id: 'nut_allergy', label: 'Alergia a frutos secos' },
      { id: 'shellfish_allergy', label: 'Alergia a mariscos' },
      { id: 'halal', label: 'Halal' },
      { id: 'kosher', label: 'Kosher' },
    ],
    nights: [
      { key: 'thursday_night', label: 'Jueves por la noche' },
      { key: 'friday_night', label: 'Viernes por la noche' },
      { key: 'saturday_night', label: 'Sábado por la noche' },
    ],
  },
};

export function getTranslation(locale: string = 'en') {
  return translations[locale as keyof typeof translations] || translations.en;
}
