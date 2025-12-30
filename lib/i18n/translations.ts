import { Locale } from './locales';

export const translations = {
  en: {
    common: {
      loading: 'Loading...',
      sending: 'Sending...',
    },
    rsvp: {
      title: 'Let us know if you can make it',
      subtitle: 'Any answer helps us plan – yes, no, or maybe.',
      notFound: {
        title: 'Not Found',
        message: "We couldn't find your invitation. Please check your invitation link.",
      },
      attending: {
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No',
      },
      form: {
        name: {
          label: 'Your Name',
          required: true,
          placeholder: 'John Doe',
          error: "How you'd like us to address you. It's required.",
        },
        email: {
          label: 'Email Address',
          required: true,
          placeholder: 'Your email address',
          error: 'Please enter a valid email address',
        },
        address: {
          label: 'Postal address',
          required: true,
          placeholder: 'So we can send you a formal invitation.',
          error: 'Address is required',
        },
        notes: {
          label: 'Notes (Optional)',
          placeholder: {
            yes: 'Any special requests or comments...',
            default: "Let us know if there's anything you'd like to share...",
          },
          counter: (count: number) => `${count}/500`,
        },
      },
      submit: {
        button: 'Send response',
        sending: 'Sending...',
        error: 'There was an error submitting your RSVP. Please try again or contact us directly.',
      },
    },
    confirmation: {
      title: 'Thank You!',
      subtitle: "We've received your response and will be in touch soon.",
      backHome: 'Back to Home',
      message: {
        yes: "We're thrilled you can join us! We'll send you the formal invitation soon.",
        maybe: "We hope you can make it! We'll keep you updated.",
        no: "We're sorry you can't make it, but we appreciate you letting us know.",
      },
    },
  },
  pt: {
    common: {
      loading: 'Carregando...',
      sending: 'Enviando...',
    },
    rsvp: {
      title: 'Confirme a sua presença',
      subtitle: 'Qualquer resposta nos ajuda a planejar – sim, não ou talvez.',
      notFound: {
        title: 'Não Encontrado',
        message: 'Não conseguimos encontrar o seu convite. Por favor, verifique o link do convite.',
      },
      attending: {
        yes: 'Sim',
        maybe: 'Talvez',
        no: 'Não',
      },
      form: {
        name: {
          label: 'Seu Nome',
          required: true,
          placeholder: 'João Silva',
          error: 'Como gostaria que nos dirigíssemos a você. É obrigatório.',
        },
        email: {
          label: 'Endereço de Email',
          required: true,
          placeholder: 'Seu endereço de email',
          error: 'Por favor, insira um endereço de email válido',
        },
        address: {
          label: 'Endereço postal',
          required: true,
          placeholder: 'Para que possamos enviar-lhe um convite formal.',
          error: 'O endereço é obrigatório',
        },
        notes: {
          label: 'Notas (Opcional)',
          placeholder: {
            yes: 'Algum pedido especial ou comentário...',
            default: 'Deixe-nos saber se há algo que gostaria de partilhar...',
          },
          counter: (count: number) => `${count}/500`,
        },
      },
      submit: {
        button: 'Enviar resposta',
        sending: 'Enviando...',
        error: 'Ocorreu um erro ao enviar o seu RSVP. Por favor, tente novamente ou contacte-nos diretamente.',
      },
    },
    confirmation: {
      title: 'Obrigado!',
      subtitle: 'Recebemos a sua resposta e entraremos em contacto em breve.',
      backHome: 'Voltar ao Início',
      message: {
        yes: 'Estamos muito felizes por poder contar consigo! Enviaremos o convite formal em breve.',
        maybe: 'Esperamos que possa comparecer! Manteremos você informado.',
        no: 'Lamentamos que não possa comparecer, mas agradecemos por nos ter informado.',
      },
    },
  },
  es: {
    common: {
      loading: 'Cargando...',
      sending: 'Enviando...',
    },
    rsvp: {
      title: 'Confirma tu asistencia',
      subtitle: 'Cualquier respuesta nos ayuda a planear – sí, no o quizás.',
      notFound: {
        title: 'No Encontrado',
        message: 'No pudimos encontrar tu invitación. Por favor, verifica el enlace de la invitación.',
      },
      attending: {
        yes: 'Sí',
        maybe: 'Quizás',
        no: 'No',
      },
      form: {
        name: {
          label: 'Tu Nombre',
          required: true,
          placeholder: 'Juan Pérez',
          error: 'Cómo te gustaría que nos dirigiéramos a ti. Es obligatorio.',
        },
        email: {
          label: 'Dirección de Email',
          required: true,
          placeholder: 'Tu dirección de email',
          error: 'Por favor, ingresa una dirección de email válida',
        },
        address: {
          label: 'Dirección postal',
          required: true,
          placeholder: 'Para que podamos enviarte una invitación formal.',
          error: 'La dirección es obligatoria',
        },
        notes: {
          label: 'Notas (Opcional)',
          placeholder: {
            yes: 'Alguna solicitud especial o comentario...',
            default: 'Déjanos saber si hay algo que te gustaría compartir...',
          },
          counter: (count: number) => `${count}/500`,
        },
      },
      submit: {
        button: 'Enviar respuesta',
        sending: 'Enviando...',
        error: 'Hubo un error al enviar tu RSVP. Por favor, inténtalo de nuevo o contáctanos directamente.',
      },
    },
    confirmation: {
      title: '¡Gracias!',
      subtitle: 'Hemos recibido tu respuesta y nos pondremos en contacto pronto.',
      backHome: 'Volver al Inicio',
      message: {
        yes: '¡Estamos encantados de que puedas acompañarnos! Te enviaremos la invitación formal pronto.',
        maybe: '¡Esperamos que puedas asistir! Te mantendremos informado.',
        no: 'Lamentamos que no puedas asistir, pero agradecemos que nos lo hayas informado.',
      },
    },
  },
};

export type TranslationKeys = {
  common: {
    loading: string;
    sending: string;
  };
  rsvp: {
    title: string;
    subtitle: string;
    notFound: {
      title: string;
      message: string;
    };
    attending: {
      yes: string;
      maybe: string;
      no: string;
    };
    form: {
      name: {
        label: string;
        required: boolean;
        placeholder: string;
        error: string;
      };
      email: {
        label: string;
        required: boolean;
        placeholder: string;
        error: string;
      };
      address: {
        label: string;
        required: boolean;
        placeholder: string;
        error: string;
      };
      notes: {
        label: string;
        placeholder: {
          yes: string;
          default: string;
        };
        counter: (count: number) => string;
      };
    };
    submit: {
      button: string;
      sending: string;
      error: string;
    };
  };
  confirmation: {
    title: string;
    subtitle: string;
    backHome: string;
    message: {
      yes: string;
      maybe: string;
      no: string;
    };
  };
};

export function getTranslation(locale: Locale): TranslationKeys {
  return translations[locale];
}
