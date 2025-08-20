import { Injectable, Logger } from '@nestjs/common';

export interface MultiLanguageContent {
  en: string;
  fr: string;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  /**
   * Generate activity descriptions in both English and French
   */
  generateActivityDescription(
    activityType: string,
    context: Record<string, any> = {},
    isSuccess: boolean = true,
  ): MultiLanguageContent {
    const descriptions = this.getActivityDescriptions(
      activityType,
      context,
      isSuccess,
    );
    return {
      en: descriptions.en,
      fr: descriptions.fr,
    };
  }

  /**
   * Get activity descriptions based on type and context
   */
  private getActivityDescriptions(
    activityType: string,
    context: Record<string, any> = {},
    isSuccess: boolean = true,
  ): MultiLanguageContent {
    const {
      userName,
      schoolName,
      moduleName,
      chapterName,
      targetUserName,
      action,
    } = context;
    const status = isSuccess ? 'successfully' : 'failed';

    switch (activityType) {
      case 'USER_LOGIN':
        return {
          en: `${userName || 'User'} logged in ${status}`,
          fr: `${userName || 'Utilisateur'} s'est connecté ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'USER_LOGOUT':
        return {
          en: `${userName || 'User'} logged out ${status}`,
          fr: `${userName || 'Utilisateur'} s'est déconnecté ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'MODULE_ACCESSED':
        return {
          en: `${userName || 'User'} accessed module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a accédé au module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'CHAPTER_ACCESSED':
        return {
          en: `${userName || 'User'} accessed chapter: ${chapterName || 'Unknown Chapter'} in module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a accédé au chapitre: ${chapterName || 'Chapitre Inconnu'} dans le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'MODULE_CREATED':
        return {
          en: `${userName || 'User'} created module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a créé le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'MODULE_UPDATED':
        return {
          en: `${userName || 'User'} updated module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a mis à jour le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'MODULE_DELETED':
        return {
          en: `${userName || 'User'} deleted module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a supprimé le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'CHAPTER_CREATED':
        return {
          en: `${userName || 'User'} created chapter: ${chapterName || 'Unknown Chapter'} in module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a créé le chapitre: ${chapterName || 'Chapitre Inconnu'} dans le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'CHAPTER_UPDATED':
        return {
          en: `${userName || 'User'} updated chapter: ${chapterName || 'Unknown Chapter'} in module: ${moduleName || 'Module Inconnu'} ${status}`,
          fr: `${userName || 'Utilisateur'} a mis à jour le chapitre: ${chapterName || 'Chapitre Inconnu'} dans le module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'CHAPTER_DELETED':
        return {
          en: `${userName || 'User'} deleted chapter: ${chapterName || 'Unknown Chapter'} from module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a supprimé le chapitre: ${chapterName || 'Chapitre Inconnu'} du module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'QUIZ_COMPLETED':
        return {
          en: `${userName || 'User'} completed quiz in chapter: ${chapterName || 'Unknown Chapter'} ${status}`,
          fr: `${userName || 'Utilisateur'} a terminé le quiz dans le chapitre: ${chapterName || 'Chapitre Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'USER_CREATED':
        return {
          en: `${userName || 'User'} account was created ${status}`,
          fr: `Le compte de ${userName || 'Utilisateur'} a été créé ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'USER_UPDATED':
        return {
          en: `${userName || 'User'} profile was updated ${status}`,
          fr: `Le profil de ${userName || 'Utilisateur'} a été mis à jour ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'USER_DELETED':
        return {
          en: `${userName || 'User'} account was deleted ${status}`,
          fr: `Le compte de ${userName || 'Utilisateur'} a été supprimé ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'SCHOOL_CREATED':
        return {
          en: `School "${schoolName || 'Unknown School'}" was created ${status}`,
          fr: `L'école "${schoolName || 'École Inconnue'}" a été créée ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'SCHOOL_UPDATED':
        return {
          en: `School "${schoolName || 'Unknown School'}" was updated ${status}`,
          fr: `L'école "${schoolName || 'École Inconnue'}" a été mise à jour ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'SCHOOL_DELETED':
        return {
          en: `School "${schoolName || 'Unknown School'}" was deleted ${status}`,
          fr: `L'école "${schoolName || 'École Inconnue'}" a été supprimée ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'PROFESSOR_ASSIGNED':
        return {
          en: `${targetUserName || 'Professor'} was assigned to module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${targetUserName || 'Professeur'} a été assigné au module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'PROFESSOR_UNASSIGNED':
        return {
          en: `${targetUserName || 'Professor'} was unassigned from module: ${moduleName || 'Unknown Module'} ${status}`,
          fr: `${targetUserName || 'Professeur'} a été désassigné du module: ${moduleName || 'Module Inconnu'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'STUDENT_ENROLLED':
        return {
          en: `${targetUserName || 'Student'} was enrolled in school: ${schoolName || 'Unknown School'} ${status}`,
          fr: `${targetUserName || 'Étudiant'} a été inscrit à l'école: ${schoolName || 'École Inconnue'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'STUDENT_UNENROLLED':
        return {
          en: `${targetUserName || 'Student'} was unenrolled from school: ${schoolName || 'Unknown School'} ${status}`,
          fr: `${targetUserName || 'Étudiant'} a été désinscrit de l'école: ${schoolName || 'École Inconnue'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'FILE_UPLOADED':
        return {
          en: `${userName || 'User'} uploaded a file to ${moduleName || 'module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a téléchargé un fichier vers ${moduleName || 'le module'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'FILE_DELETED':
        return {
          en: `${userName || 'User'} deleted a file from ${moduleName || 'module'} ${status}`,
          fr: `${userName || 'Utilisateur'} a supprimé un fichier du ${moduleName || 'module'} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'SETTINGS_UPDATED':
        return {
          en: `${userName || 'User'} updated settings ${status}`,
          fr: `${userName || 'Utilisateur'} a mis à jour les paramètres ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'PASSWORD_CHANGED':
        return {
          en: `${userName || 'User'} changed password ${status}`,
          fr: `${userName || 'Utilisateur'} a changé le mot de passe ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'EMAIL_VERIFIED':
        return {
          en: `${userName || 'User'} verified email address ${status}`,
          fr: `${userName || 'Utilisateur'} a vérifié l'adresse e-mail ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };

      case 'LOGIN_FAILED':
        return {
          en: `Failed login attempt for user: ${userName || 'Unknown User'}`,
          fr: `Tentative de connexion échouée pour l'utilisateur: ${userName || 'Utilisateur Inconnu'}`,
        };

      case 'PERMISSION_DENIED':
        return {
          en: `${userName || 'User'} was denied access to ${action || 'resource'}`,
          fr: `${userName || 'Utilisateur'} s'est vu refuser l'accès à ${action || 'la ressource'}`,
        };

      case 'SYSTEM_ERROR':
        return {
          en: `System error occurred: ${action || 'Unknown error'}`,
          fr: `Erreur système survenue: ${action || 'Erreur inconnue'}`,
        };

      default:
        return {
          en: `${userName || 'User'} performed action: ${activityType} ${status}`,
          fr: `${userName || 'Utilisateur'} a effectué l'action: ${activityType} ${isSuccess ? 'avec succès' : 'sans succès'}`,
        };
    }
  }

  /**
   * Create multi-language content object
   */
  createMultiLanguageContent(
    englishContent: string,
    frenchContent: string,
  ): MultiLanguageContent {
    return {
      en: englishContent,
      fr: frenchContent,
    };
  }

  /**
   * Get the appropriate language content from multi-language content
   */
  getLocalizedContent(
    content: MultiLanguageContent,
    preferredLanguage: 'en' | 'fr',
    fallbackLanguage: 'en' | 'fr' = 'en',
  ): string {
    if (!content) {
      return '';
    }

    // Try to get content in preferred language
    if (content[preferredLanguage]) {
      return content[preferredLanguage];
    }

    // Fallback to fallback language if preferred language is not available
    if (content[fallbackLanguage]) {
      return content[fallbackLanguage];
    }

    // If no content is available, return empty string
    return '';
  }

  /**
   * Validate if content is a valid multi-language content object
   */
  isValidMultiLanguageContent(content: any): content is MultiLanguageContent {
    return (
      content &&
      typeof content === 'object' &&
      typeof content.en === 'string' &&
      typeof content.fr === 'string'
    );
  }
}
