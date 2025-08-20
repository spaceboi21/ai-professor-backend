import { LanguageEnum } from './language.constant';
import { ActivityTypeEnum } from './activity.constant';

export interface ActivityDescriptionTranslations {
  [LanguageEnum.ENGLISH]: string;
  [LanguageEnum.FRENCH]: string;
}

export interface ActivityDescriptions {
  [ActivityTypeEnum.USER_LOGIN]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.USER_LOGOUT]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.USER_CREATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.USER_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.USER_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.SCHOOL_CREATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.SCHOOL_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.SCHOOL_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_CREATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_ASSIGNED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_STARTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.MODULE_COMPLETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_CREATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_REORDERED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_STARTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.CHAPTER_COMPLETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_CREATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_ATTEMPTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_STARTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.QUIZ_SUBMITTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.PROGRESS_UPDATED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.PROGRESS_COMPLETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.AI_CHAT_STARTED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.AI_CHAT_MESSAGE_SENT]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.AI_FEEDBACK_GIVEN]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.FILE_UPLOADED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
  [ActivityTypeEnum.FILE_DELETED]: {
    success: ActivityDescriptionTranslations;
    failed: ActivityDescriptionTranslations;
  };
}

export const ACTIVITY_DESCRIPTIONS: ActivityDescriptions = {
  [ActivityTypeEnum.USER_LOGIN]: {
    success: {
      [LanguageEnum.ENGLISH]: 'User login successfully',
      [LanguageEnum.FRENCH]: 'Connexion utilisateur réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'User login failed',
      [LanguageEnum.FRENCH]: 'Échec de la connexion utilisateur',
    },
  },
  [ActivityTypeEnum.USER_LOGOUT]: {
    success: {
      [LanguageEnum.ENGLISH]: 'User logout successfully',
      [LanguageEnum.FRENCH]: 'Déconnexion utilisateur réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'User logout failed',
      [LanguageEnum.FRENCH]: 'Échec de la déconnexion utilisateur',
    },
  },
  [ActivityTypeEnum.USER_CREATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'User creation successfully',
      [LanguageEnum.FRENCH]: "Création d'utilisateur réussie",
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'User creation failed',
      [LanguageEnum.FRENCH]: "Échec de la création d'utilisateur",
    },
  },
  [ActivityTypeEnum.USER_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'User update successfully',
      [LanguageEnum.FRENCH]: 'Mise à jour utilisateur réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'User update failed',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour utilisateur',
    },
  },
  [ActivityTypeEnum.USER_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'User deletion successfully',
      [LanguageEnum.FRENCH]: "Suppression d'utilisateur réussie",
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'User deletion failed',
      [LanguageEnum.FRENCH]: "Échec de la suppression d'utilisateur",
    },
  },
  [ActivityTypeEnum.SCHOOL_CREATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'School creation successfully',
      [LanguageEnum.FRENCH]: "Création d'école réussie",
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'School creation failed',
      [LanguageEnum.FRENCH]: "Échec de la création d'école",
    },
  },
  [ActivityTypeEnum.SCHOOL_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'School update successfully',
      [LanguageEnum.FRENCH]: "Mise à jour d'école réussie",
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'School update failed',
      [LanguageEnum.FRENCH]: "Échec de la mise à jour d'école",
    },
  },
  [ActivityTypeEnum.SCHOOL_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'School deletion successfully',
      [LanguageEnum.FRENCH]: "Suppression d'école réussie",
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'School deletion failed',
      [LanguageEnum.FRENCH]: "Échec de la suppression d'école",
    },
  },
  [ActivityTypeEnum.MODULE_CREATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module creation successfully',
      [LanguageEnum.FRENCH]: 'Création de module réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module creation failed',
      [LanguageEnum.FRENCH]: 'Échec de la création de module',
    },
  },
  [ActivityTypeEnum.MODULE_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module update successfully',
      [LanguageEnum.FRENCH]: 'Mise à jour de module réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module update failed',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour de module',
    },
  },
  [ActivityTypeEnum.MODULE_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module deletion successfully',
      [LanguageEnum.FRENCH]: 'Suppression de module réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module deletion failed',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de module',
    },
  },
  [ActivityTypeEnum.MODULE_ASSIGNED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module assignment successfully',
      [LanguageEnum.FRENCH]: 'Attribution de module réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module assignment failed',
      [LanguageEnum.FRENCH]: "Échec de l'attribution de module",
    },
  },
  [ActivityTypeEnum.MODULE_STARTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module started successfully',
      [LanguageEnum.FRENCH]: 'Module commencé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module started failed',
      [LanguageEnum.FRENCH]: 'Échec du démarrage du module',
    },
  },
  [ActivityTypeEnum.MODULE_COMPLETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Module completed successfully',
      [LanguageEnum.FRENCH]: 'Module terminé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Module completed failed',
      [LanguageEnum.FRENCH]: 'Échec de la complétion du module',
    },
  },
  [ActivityTypeEnum.CHAPTER_CREATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter creation successfully',
      [LanguageEnum.FRENCH]: 'Création de chapitre réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter creation failed',
      [LanguageEnum.FRENCH]: 'Échec de la création de chapitre',
    },
  },
  [ActivityTypeEnum.CHAPTER_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter update successfully',
      [LanguageEnum.FRENCH]: 'Mise à jour de chapitre réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter update failed',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour de chapitre',
    },
  },
  [ActivityTypeEnum.CHAPTER_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter deletion successfully',
      [LanguageEnum.FRENCH]: 'Suppression de chapitre réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter deletion failed',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de chapitre',
    },
  },
  [ActivityTypeEnum.CHAPTER_REORDERED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter reordering successfully',
      [LanguageEnum.FRENCH]: 'Réorganisation de chapitre réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter reordering failed',
      [LanguageEnum.FRENCH]: 'Échec de la réorganisation de chapitre',
    },
  },
  [ActivityTypeEnum.CHAPTER_STARTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter started successfully',
      [LanguageEnum.FRENCH]: 'Chapitre commencé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter started failed',
      [LanguageEnum.FRENCH]: 'Échec du démarrage du chapitre',
    },
  },
  [ActivityTypeEnum.CHAPTER_COMPLETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Chapter completed successfully',
      [LanguageEnum.FRENCH]: 'Chapitre terminé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Chapter completed failed',
      [LanguageEnum.FRENCH]: 'Échec de la complétion du chapitre',
    },
  },
  [ActivityTypeEnum.QUIZ_CREATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz creation successfully',
      [LanguageEnum.FRENCH]: 'Création de quiz réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz creation failed',
      [LanguageEnum.FRENCH]: 'Échec de la création de quiz',
    },
  },
  [ActivityTypeEnum.QUIZ_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz update successfully',
      [LanguageEnum.FRENCH]: 'Mise à jour de quiz réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz update failed',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour de quiz',
    },
  },
  [ActivityTypeEnum.QUIZ_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz deletion successfully',
      [LanguageEnum.FRENCH]: 'Suppression de quiz réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz deletion failed',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de quiz',
    },
  },
  [ActivityTypeEnum.QUIZ_ATTEMPTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz attempt successfully',
      [LanguageEnum.FRENCH]: 'Tentative de quiz réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz attempt failed',
      [LanguageEnum.FRENCH]: 'Échec de la tentative de quiz',
    },
  },
  [ActivityTypeEnum.QUIZ_STARTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz started successfully',
      [LanguageEnum.FRENCH]: 'Quiz commencé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz started failed',
      [LanguageEnum.FRENCH]: 'Échec du démarrage du quiz',
    },
  },
  [ActivityTypeEnum.QUIZ_SUBMITTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Quiz submitted successfully',
      [LanguageEnum.FRENCH]: 'Quiz soumis avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Quiz submitted failed',
      [LanguageEnum.FRENCH]: 'Échec de la soumission du quiz',
    },
  },
  [ActivityTypeEnum.PROGRESS_UPDATED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Progress update successfully',
      [LanguageEnum.FRENCH]: 'Mise à jour du progrès réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Progress update failed',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du progrès',
    },
  },
  [ActivityTypeEnum.PROGRESS_COMPLETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'Progress completed successfully',
      [LanguageEnum.FRENCH]: 'Progrès terminé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'Progress completed failed',
      [LanguageEnum.FRENCH]: 'Échec de la complétion du progrès',
    },
  },
  [ActivityTypeEnum.AI_CHAT_STARTED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'AI chat session started successfully',
      [LanguageEnum.FRENCH]: 'Session de chat IA commencée avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'AI chat session started failed',
      [LanguageEnum.FRENCH]: 'Échec du démarrage de la session de chat IA',
    },
  },
  [ActivityTypeEnum.AI_CHAT_MESSAGE_SENT]: {
    success: {
      [LanguageEnum.ENGLISH]: 'AI chat message sent successfully',
      [LanguageEnum.FRENCH]: 'Message de chat IA envoyé avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'AI chat message sent failed',
      [LanguageEnum.FRENCH]: "Échec de l'envoi du message de chat IA",
    },
  },
  [ActivityTypeEnum.AI_FEEDBACK_GIVEN]: {
    success: {
      [LanguageEnum.ENGLISH]: 'AI feedback provided successfully',
      [LanguageEnum.FRENCH]: 'Commentaire IA fourni avec succès',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'AI feedback provided failed',
      [LanguageEnum.FRENCH]: 'Échec de la fourniture du commentaire IA',
    },
  },
  [ActivityTypeEnum.FILE_UPLOADED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'File upload successfully',
      [LanguageEnum.FRENCH]: 'Téléchargement de fichier réussi',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'File upload failed',
      [LanguageEnum.FRENCH]: 'Échec du téléchargement de fichier',
    },
  },
  [ActivityTypeEnum.FILE_DELETED]: {
    success: {
      [LanguageEnum.ENGLISH]: 'File deletion successfully',
      [LanguageEnum.FRENCH]: 'Suppression de fichier réussie',
    },
    failed: {
      [LanguageEnum.ENGLISH]: 'File deletion failed',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de fichier',
    },
  },
};

/**
 * Get activity description in both languages
 * @param activityType - The activity type
 * @param isSuccess - Whether the activity was successful
 * @returns Object with both English and French descriptions
 */
export function getActivityDescription(
  activityType: ActivityTypeEnum,
  isSuccess: boolean,
): ActivityDescriptionTranslations {
  const status = isSuccess ? 'success' : 'failed';
  const descriptions = ACTIVITY_DESCRIPTIONS[activityType];

  if (!descriptions) {
    // Fallback for unknown activity types
    return {
      [LanguageEnum.ENGLISH]: `Activity ${status}`,
      [LanguageEnum.FRENCH]: `Activité ${isSuccess ? 'réussie' : 'échouée'}`,
    };
  }

  return descriptions[status];
}

/**
 * Get activity description for a specific language
 * @param activityType - The activity type
 * @param isSuccess - Whether the activity was successful
 * @param language - The language to get the description in
 * @returns Description in the specified language
 */
export function getActivityDescriptionForLanguage(
  activityType: ActivityTypeEnum,
  isSuccess: boolean,
  language: LanguageEnum,
): string {
  const descriptions = getActivityDescription(activityType, isSuccess);
  return descriptions[language];
}
