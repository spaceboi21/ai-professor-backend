import { LanguageEnum } from './language.constant';

export interface ErrorMessages {
  [LanguageEnum.ENGLISH]: string;
  [LanguageEnum.FRENCH]: string;
}

export interface ErrorMessageCategory {
  [key: string]: ErrorMessages;
}

export const ERROR_MESSAGES: {
  [key: string]: { [key: string]: ErrorMessages };
} = {
  // Authentication & Authorization
  AUTH: {
    INVALID_TOKEN_TYPE: {
      [LanguageEnum.ENGLISH]: 'Invalid token type',
      [LanguageEnum.FRENCH]: 'Type de jeton invalide',
    },
    INVALID_ROLE_INFORMATION: {
      [LanguageEnum.ENGLISH]: 'Invalid role information',
      [LanguageEnum.FRENCH]: 'Informations de rôle invalides',
    },
    USER_NOT_AUTHENTICATED: {
      [LanguageEnum.ENGLISH]: 'User not authenticated or missing role',
      [LanguageEnum.FRENCH]: 'Utilisateur non authentifié ou rôle manquant',
    },
    USER_NOT_FOUND_CENTRAL: {
      [LanguageEnum.ENGLISH]: 'User not found in central users',
      [LanguageEnum.FRENCH]:
        'Utilisateur non trouvé dans les utilisateurs centraux',
    },
    TOKEN_VALIDATION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Token validation failed: {error}',
      [LanguageEnum.FRENCH]: 'Échec de la validation du jeton: {error}',
    },
    ACCESS_DENIED: {
      [LanguageEnum.ENGLISH]: 'Access denied. Insufficient permissions.',
      [LanguageEnum.FRENCH]: 'Accès refusé. Permissions insuffisantes.',
    },
    INVALID_ACCESS_TOKEN: {
      [LanguageEnum.ENGLISH]: 'Invalid access token: {error}',
      [LanguageEnum.FRENCH]: "Jeton d'accès invalide: {error}",
    },
    INVALID_REFRESH_TOKEN: {
      [LanguageEnum.ENGLISH]: 'Invalid refresh token: {error}',
      [LanguageEnum.FRENCH]: 'Jeton de rafraîchissement invalide: {error}',
    },
    INVALID_EMAIL_PASSWORD: {
      [LanguageEnum.ENGLISH]: 'Invalid email or password',
      [LanguageEnum.FRENCH]: 'Email ou mot de passe invalide',
    },
    INVALID_OLD_PASSWORD: {
      [LanguageEnum.ENGLISH]: 'Invalid old password',
      [LanguageEnum.FRENCH]: 'Ancien mot de passe invalide',
    },
    CURRENT_PASSWORD_MISMATCH: {
      [LanguageEnum.ENGLISH]: 'Current password is incorrect',
      [LanguageEnum.FRENCH]: 'Le mot de passe actuel est incorrect',
    },
    INVALID_RESET_TOKEN: {
      [LanguageEnum.ENGLISH]: 'Invalid reset token',
      [LanguageEnum.FRENCH]: 'Jeton de réinitialisation invalide',
    },
    INVALID_EXPIRED_RESET_TOKEN: {
      [LanguageEnum.ENGLISH]: 'Invalid or expired reset token',
      [LanguageEnum.FRENCH]: 'Jeton de réinitialisation invalide ou expiré',
    },
    INVALID_USER_TYPE_RESET: {
      [LanguageEnum.ENGLISH]: 'Invalid user type for password reset',
      [LanguageEnum.FRENCH]:
        "Type d'utilisateur invalide pour la réinitialisation du mot de passe",
    },
  },

  // School Related
  SCHOOL: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found',
      [LanguageEnum.FRENCH]: 'École non trouvée',
    },
    NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'School not found after update',
      [LanguageEnum.FRENCH]: 'École non trouvée après la mise à jour',
    },
    ACCESS_OWN_ONLY: {
      [LanguageEnum.ENGLISH]: 'You can only access your own school',
      [LanguageEnum.FRENCH]: "Vous ne pouvez accéder qu'à votre propre école",
    },
    UNAUTHORIZED_UPDATE: {
      [LanguageEnum.ENGLISH]: 'You are not authorized to update this school',
      [LanguageEnum.FRENCH]:
        "Vous n'êtes pas autorisé à mettre à jour cette école",
    },
    ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'School ID is required',
      [LanguageEnum.FRENCH]: "L'identifiant de l'école est requis",
    },
    ADMIN_MUST_HAVE_SCHOOL_ID: {
      [LanguageEnum.ENGLISH]: 'School admin must have a school_id',
      [LanguageEnum.FRENCH]:
        "L'administrateur de l'école doit avoir un school_id",
    },
    USER_SCHOOL_ID_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'User school ID not found',
      [LanguageEnum.FRENCH]: "Identifiant d'école de l'utilisateur non trouvé",
    },
    NOT_FOUND_FOR_USER: {
      [LanguageEnum.ENGLISH]: 'School not found for this user',
      [LanguageEnum.FRENCH]: 'École non trouvée pour cet utilisateur',
    },
    NOT_FOUND_FOR_STUDENT: {
      [LanguageEnum.ENGLISH]: 'School not found for this student',
      [LanguageEnum.FRENCH]: 'École non trouvée pour cet étudiant',
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update school details',
      [LanguageEnum.FRENCH]: "Échec de la mise à jour des détails de l'école",
    },
    ACCOUNT_DEACTIVATED: {
      [LanguageEnum.ENGLISH]:
        'Your school has been deactivated. Please contact support for assistance.',
      [LanguageEnum.FRENCH]:
        "Votre école a été désactivée. Veuillez contacter le support pour obtenir de l'aide.",
    },
    VALIDATION_FAILED: {
      [LanguageEnum.ENGLISH]: 'School validation failed: {error}',
      [LanguageEnum.FRENCH]: "Échec de la validation de l'école: {error}",
    },
    SCHOOL_ALREADY_EXISTS: {
      [LanguageEnum.ENGLISH]: 'School with this email already exists',
      [LanguageEnum.FRENCH]: 'Une école avec cet email existe déjà',
    },
  },

  // User Related
  USER: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'User not found',
      [LanguageEnum.FRENCH]: 'Utilisateur non trouvé',
    },
    NOT_FOUND_WITH_EMAIL: {
      [LanguageEnum.ENGLISH]: 'User not found with this email',
      [LanguageEnum.FRENCH]: 'Utilisateur non trouvé avec cet email',
    },
    NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'User not found after update',
      [LanguageEnum.FRENCH]: 'Utilisateur non trouvé après la mise à jour',
    },
    UNAUTHORIZED_ROLE_ACCESS: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for accessing users',
      [LanguageEnum.FRENCH]: 'Rôle non autorisé pour accéder aux utilisateurs',
    },
    UNAUTHORIZED_ROLE_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for updating users',
      [LanguageEnum.FRENCH]:
        'Rôle non autorisé pour mettre à jour les utilisateurs',
    },
    UNAUTHORIZED_ROLE_DELETE: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for deleting users',
      [LanguageEnum.FRENCH]:
        'Rôle non autorisé pour supprimer les utilisateurs',
    },
    ACCOUNT_DELETED: {
      [LanguageEnum.ENGLISH]:
        'Your account has been deleted. Please contact support for assistance.',
      [LanguageEnum.FRENCH]:
        "Votre compte a été supprimé. Veuillez contacter le support pour obtenir de l'aide.",
    },
    ACCOUNT_DEACTIVATED: {
      [LanguageEnum.ENGLISH]:
        'Your account has been deactivated. Please contact support for assistance.',
      [LanguageEnum.FRENCH]:
        "Votre compte a été désactivé. Veuillez contacter le support pour obtenir de l'aide.",
    },
    SUPER_ADMIN_STATUS_CHANGE_FORBIDDEN: {
      [LanguageEnum.ENGLISH]: 'Super admin cannot change their own status',
      [LanguageEnum.FRENCH]:
        'Le super administrateur ne peut pas changer son propre statut',
    },
    USER_ALREADY_EXISTS: {
      [LanguageEnum.ENGLISH]: 'User with this email already exists',
      [LanguageEnum.FRENCH]: 'Un utilisateur avec cet email existe déjà',
    },
  },

  // Student Related
  STUDENT: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Student not found',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé',
    },
    NOT_FOUND_WITH_EMAIL: {
      [LanguageEnum.ENGLISH]: 'Student not found with this email',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé avec cet email',
    },
    NOT_FOUND_IN_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Student not found in school database',
      [LanguageEnum.FRENCH]:
        "Étudiant non trouvé dans la base de données de l'école",
    },
    NOT_FOUND_IN_TENANT_DATABASE: {
      [LanguageEnum.ENGLISH]: 'Student not found in tenant database',
      [LanguageEnum.FRENCH]:
        'Étudiant non trouvé dans la base de données du locataire',
    },
    NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Student not found after update',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé après la mise à jour',
    },
    NOT_FOUND_OR_DELETED: {
      [LanguageEnum.ENGLISH]: 'Student not found or already deleted',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé ou déjà supprimé',
    },
    EMAIL_EXISTS: {
      [LanguageEnum.ENGLISH]: 'Student with this email already exists',
      [LanguageEnum.FRENCH]: 'Un étudiant avec cet email existe déjà',
    },
    EMAIL_EXISTS_IN_SCHOOL: {
      [LanguageEnum.ENGLISH]:
        'Student with this email already exists in school database',
      [LanguageEnum.FRENCH]:
        "Un étudiant avec cet email existe déjà dans la base de données de l'école",
    },
    EMAIL_EXISTS_SYSTEM: {
      [LanguageEnum.ENGLISH]: 'Email already exists in the system',
      [LanguageEnum.FRENCH]: 'Cet email existe déjà dans le système',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create student',
      [LanguageEnum.FRENCH]: "Échec de la création de l'étudiant",
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update student',
      [LanguageEnum.FRENCH]: "Échec de la mise à jour de l'étudiant",
    },
    DELETE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete student',
      [LanguageEnum.FRENCH]: "Échec de la suppression de l'étudiant",
    },
    PASSWORD_UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update password',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du mot de passe',
    },
    CSV_NO_VALID_DATA: {
      [LanguageEnum.ENGLISH]: 'No valid student data found in CSV file',
      [LanguageEnum.FRENCH]:
        "Aucune donnée d'étudiant valide trouvée dans le fichier CSV",
    },
    CSV_ONLY_ALLOWED: {
      [LanguageEnum.ENGLISH]: 'Only CSV files are allowed',
      [LanguageEnum.FRENCH]: 'Seuls les fichiers CSV sont autorisés',
    },
    CSV_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'CSV file is required',
      [LanguageEnum.FRENCH]: 'Le fichier CSV est requis',
    },
    ACCOUNT_DEACTIVATED: {
      [LanguageEnum.ENGLISH]:
        'Your account has been deactivated. Please contact support for assistance.',
      [LanguageEnum.FRENCH]:
        "Votre compte a été désactivé. Veuillez contacter le support pour obtenir de l'aide.",
    },
    VALIDATION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Student validation failed: {error}',
      [LanguageEnum.FRENCH]: "Échec de la validation de l'étudiant: {error}",
    },
    INVALID_RESET_TOKEN: {
      [LanguageEnum.ENGLISH]: 'Invalid reset token',
      [LanguageEnum.FRENCH]: 'Jeton de réinitialisation invalide',
    },
    UNAUTHORIZED_ACCESS: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for accessing students',
      [LanguageEnum.FRENCH]: 'Rôle non autorisé pour accéder aux étudiants',
    },
    UNAUTHORIZED_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for updating students',
      [LanguageEnum.FRENCH]:
        'Rôle non autorisé pour mettre à jour les étudiants',
    },
    UNAUTHORIZED_DELETE: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for deleting students',
      [LanguageEnum.FRENCH]: 'Rôle non autorisé pour supprimer les étudiants',
    },
    ONLY_CREATE_FOR_OWN_SCHOOL: {
      [LanguageEnum.ENGLISH]:
        'You can only create students for your own school',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez créer des étudiants que pour votre propre école',
    },
    SUPER_ADMIN_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'Super admin must provide school_id parameter',
      [LanguageEnum.FRENCH]:
        'Le super administrateur doit fournir le paramètre school_id',
    },
    SUPER_ADMIN_PROFESSOR_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'Super admin or professor must provide school_id parameter',
      [LanguageEnum.FRENCH]:
        'Le super administrateur ou le professeur doit fournir le paramètre school_id',
    },
    NOT_FOUND_OR_ALREADY_DELETED: {
      [LanguageEnum.ENGLISH]: 'Student not found or already deleted',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé ou déjà supprimé',
    },
    MISSING_REQUIRED_FIELDS: {
      [LanguageEnum.ENGLISH]:
        'Missing required fields: first_name and email are required',
      [LanguageEnum.FRENCH]:
        'Champs requis manquants: first_name et email sont requis',
    },
    INVALID_EMAIL_FORMAT: {
      [LanguageEnum.ENGLISH]: 'Invalid email format',
      [LanguageEnum.FRENCH]: "Format d'email invalide",
    },
    NO_VALID_STUDENT_DATA_FOUND: {
      [LanguageEnum.ENGLISH]: 'No valid student data found in CSV file',
      [LanguageEnum.FRENCH]:
        "Aucune donnée d'étudiant valide trouvée dans le fichier CSV",
    },
    DUPLICATE_EMAIL_WITHIN_CSV: {
      [LanguageEnum.ENGLISH]: 'Duplicate email within CSV file',
      [LanguageEnum.FRENCH]: 'Email en double dans le fichier CSV',
    },
    SCHOOL_NOT_FOUND_FOR_SCHOOL_ADMIN: {
      [LanguageEnum.ENGLISH]: 'School not found for school admin',
      [LanguageEnum.FRENCH]: "École non trouvée pour l'administrateur d'école",
    },
    SCHOOL_NOT_FOUND_WITH_ID: {
      [LanguageEnum.ENGLISH]: 'School not found with provided ID',
      [LanguageEnum.FRENCH]: "École non trouvée avec l'ID fourni",
    },
    UNAUTHORIZED_ROLE_FOR_BULK_STUDENT_CREATION: {
      [LanguageEnum.ENGLISH]: 'Unauthorized role for bulk student creation',
      [LanguageEnum.FRENCH]:
        "Rôle non autorisé pour la création en masse d'étudiants",
    },
    STUDENT_ALREADY_EXISTS: {
      [LanguageEnum.ENGLISH]: 'Student with this email already exists',
      [LanguageEnum.FRENCH]: 'Un étudiant avec cet email existe déjà',
    },
  },

  // Professor Related
  PROFESSOR: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Professor not found',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé',
    },
    PROFESSOR_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Professor not found',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé',
    },
    NOT_FOUND_IN_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Professor not found or not in your school',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé ou pas dans votre école',
    },
    PROFESSOR_NOT_FOUND_OR_NOT_IN_YOUR_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Professor not found or not in your school',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé ou pas dans votre école',
    },
    NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Professor not found after update',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé après la mise à jour',
    },
    PROFESSOR_NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Professor not found after update',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé après la mise à jour',
    },
    NOT_FOUND_AFTER_DELETION: {
      [LanguageEnum.ENGLISH]: 'Professor not found after deletion',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé après la suppression',
    },
    PROFESSOR_NOT_FOUND_AFTER_DELETION: {
      [LanguageEnum.ENGLISH]: 'Professor not found after deletion',
      [LanguageEnum.FRENCH]: 'Professeur non trouvé après la suppression',
    },
    EMAIL_EXISTS: {
      [LanguageEnum.ENGLISH]: 'Email already exists',
      [LanguageEnum.FRENCH]: 'Cet email existe déjà',
    },
    EMAIL_EXISTS_SYSTEM: {
      [LanguageEnum.ENGLISH]: 'Email already exists in the system',
      [LanguageEnum.FRENCH]: 'Cet email existe déjà dans le système',
    },
    EMAIL_ALREADY_EXISTS_IN_THE_SYSTEM: {
      [LanguageEnum.ENGLISH]: 'Email already exists in the system',
      [LanguageEnum.FRENCH]: 'Cet email existe déjà dans le système',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create Professor',
      [LanguageEnum.FRENCH]: 'Échec de la création du professeur',
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update Professor',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du professeur',
    },
    PASSWORD_UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update Professor password',
      [LanguageEnum.FRENCH]:
        'Échec de la mise à jour du mot de passe du professeur',
    },
    ALREADY_DELETED: {
      [LanguageEnum.ENGLISH]: 'Professor is already deleted',
      [LanguageEnum.FRENCH]: 'Le professeur est déjà supprimé',
    },
    PROFESSOR_ALREADY_DELETED: {
      [LanguageEnum.ENGLISH]: 'Professor is already deleted',
      [LanguageEnum.FRENCH]: 'Le professeur est déjà supprimé',
    },
    CAN_ONLY_CREATE_PROFESSOR_FOR_OWN_SCHOOL: {
      [LanguageEnum.ENGLISH]:
        'You can only create professors for your own school',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez créer des professeurs que pour votre propre école',
    },
    CAN_ONLY_DELETE_PROFESSORS_FROM_OWN_SCHOOL: {
      [LanguageEnum.ENGLISH]:
        'You can only delete professors from your own school',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez supprimer des professeurs que de votre propre école',
    },
    CANNOT_DELETE_PROFESSOR_HAS_ASSIGNED_MODULES: {
      [LanguageEnum.ENGLISH]:
        'Cannot delete professor who has assigned modules',
      [LanguageEnum.FRENCH]:
        'Impossible de supprimer un professeur qui a des modules assignés',
    },
  },

  // Module Related
  MODULE: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Module not found',
      [LanguageEnum.FRENCH]: 'Module non trouvé',
    },
    NOT_FOUND_IN_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Module not found in school database',
      [LanguageEnum.FRENCH]:
        "Module non trouvé dans la base de données de l'école",
    },
    NOT_FOUND_OR_ACCESS_DENIED: {
      [LanguageEnum.ENGLISH]: 'Module not found or access denied',
      [LanguageEnum.FRENCH]: 'Module non trouvé ou accès refusé',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create module',
      [LanguageEnum.FRENCH]: 'Échec de la création du module',
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update module',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du module',
    },
    DELETE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete module',
      [LanguageEnum.FRENCH]: 'Échec de la suppression du module',
    },
    RETRIEVE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve module',
      [LanguageEnum.FRENCH]: 'Échec de la récupération du module',
    },
    RETRIEVE_MODULES_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve modules',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des modules',
    },
    RETRIEVE_OVERVIEW_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve module overview',
      [LanguageEnum.FRENCH]: "Échec de la récupération de l'aperçu du module",
    },
    ALREADY_PUBLISHED: {
      [LanguageEnum.ENGLISH]: 'Module is already published',
      [LanguageEnum.FRENCH]: 'Le module est déjà publié',
    },
    ALREADY_UNPUBLISHED: {
      [LanguageEnum.ENGLISH]: 'Module is already unpublished',
      [LanguageEnum.FRENCH]: 'Le module est déjà dépublié',
    },
    VALIDATION_FAILED: {
      [LanguageEnum.ENGLISH]:
        'Module validation failed. Please try again or contact support.',
      [LanguageEnum.FRENCH]:
        'Échec de la validation du module. Veuillez réessayer ou contacter le support.',
    },
    SUPER_ADMIN_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'School ID is required in request body for super admin',
      [LanguageEnum.FRENCH]:
        "L'ID de l'école est requis dans le corps de la requête pour le super administrateur",
    },
    MODULE_ALREADY_PUBLISHED: {
      [LanguageEnum.ENGLISH]: 'Module is already published',
      [LanguageEnum.FRENCH]: 'Le module est déjà publié',
    },
    MODULE_ALREADY_UNPUBLISHED: {
      [LanguageEnum.ENGLISH]: 'Module is already unpublished',
      [LanguageEnum.FRENCH]: 'Le module est déjà dépublié',
    },
    MODULE_MIN_CHAPTERS_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'Module must have at least one chapter to be published',
      [LanguageEnum.FRENCH]:
        'Le module doit avoir au moins un chapitre pour être publié',
    },
    MODULE_MIN_QUIZ_GROUPS_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'Module must have at least one quiz group to be published',
      [LanguageEnum.FRENCH]:
        'Le module doit avoir au moins un groupe de quiz pour être publié',
    },
    INVALID_ACTION_FOR_MODULE_VISIBILITY: {
      [LanguageEnum.ENGLISH]: 'Invalid action. Must be PUBLISH or UNPUBLISH',
      [LanguageEnum.FRENCH]: 'Action invalide. Doit être PUBLISH ou UNPUBLISH',
    },
    TOGGLE_MODULE_VISIBILITY_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to toggle module visibility',
      [LanguageEnum.FRENCH]: 'Échec du basculement de la visibilité du module',
    },
    RETRIEVE_MODULE_OVERVIEW_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve module overview',
      [LanguageEnum.FRENCH]: "Échec de la récupération de l'aperçu du module",
    },
    PYTHON_SERVICE_FETCH_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to fetch modules from Python service',
      [LanguageEnum.FRENCH]:
        'Échec de la récupération des modules depuis le service Python',
    },
    MODULE_ID_REQUIRED_WHEN_TYPE_IS_MODULE: {
      [LanguageEnum.ENGLISH]: 'Module ID is required when type is MODULE',
      [LanguageEnum.FRENCH]:
        "L'ID du module est requis lorsque le type est MODULE",
    },
    PROFESSOR_ASSIGNMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to assign professor to module',
      [LanguageEnum.FRENCH]: "Échec de l'attribution du professeur au module",
    },
    PROFESSOR_UNASSIGNMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to unassign professor from module',
      [LanguageEnum.FRENCH]:
        'Échec de la désattribution du professeur du module',
    },
    PROFESSOR_NOT_ASSIGNED_TO_MODULE: {
      [LanguageEnum.ENGLISH]: 'Professor is not assigned to this module',
      [LanguageEnum.FRENCH]: "Le professeur n'est pas assigné à ce module",
    },
    PROFESSOR_ALREADY_ASSIGNED: {
      [LanguageEnum.ENGLISH]: 'Professor is already assigned to this module',
      [LanguageEnum.FRENCH]: 'Le professeur est déjà assigné à ce module',
    },
    CHAPTER_ID_REQUIRED_WHEN_TYPE_IS_CHAPTER: {
      [LanguageEnum.ENGLISH]: 'Chapter ID is required when type is CHAPTER',
      [LanguageEnum.FRENCH]:
        "L'ID du chapitre est requis lorsque le type est CHAPTER",
    },
    MODULE_ID_REQUIRED_WHEN_TYPE_IS_ANCHOR_TAG: {
      [LanguageEnum.ENGLISH]: 'Module ID is required when type is ANCHOR_TAG',
      [LanguageEnum.FRENCH]:
        "L'ID du module est requis lorsque le type est ANCHOR_TAG",
    },
    BIBLIOGRAPHY_ID_REQUIRED_WHEN_TYPE_IS_ANCHOR_TAG: {
      [LanguageEnum.ENGLISH]:
        'Bibliography ID is required when type is ANCHOR_TAG',
      [LanguageEnum.FRENCH]:
        "L'ID de la bibliographie est requis lorsque le type est ANCHOR_TAG",
    },
    BIBLIOGRAPHY_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Bibliography not found',
      [LanguageEnum.FRENCH]: 'Bibliographie non trouvée',
    },
    QUIZ_GROUP_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Quiz group not found',
      [LanguageEnum.FRENCH]: 'Groupe de quiz non trouvé',
    },
  },

  // Chapter Related
  CHAPTER: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Chapter not found',
      [LanguageEnum.FRENCH]: 'Chapitre non trouvé',
    },
    TITLE_EXISTS: {
      [LanguageEnum.ENGLISH]:
        'Chapter with title "{title}" already exists in this module',
      [LanguageEnum.FRENCH]:
        'Un chapitre avec le titre "{title}" existe déjà dans ce module',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create chapter',
      [LanguageEnum.FRENCH]: 'Échec de la création du chapitre',
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update chapter',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du chapitre',
    },
    DELETE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete chapter',
      [LanguageEnum.FRENCH]: 'Échec de la suppression du chapitre',
    },
    RETRIEVE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve chapter',
      [LanguageEnum.FRENCH]: 'Échec de la récupération du chapitre',
    },
    RETRIEVE_ALL_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve chapters',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des chapitres',
    },
    REORDER_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to reorder chapters',
      [LanguageEnum.FRENCH]: 'Échec du réordonnancement des chapitres',
    },
    ONE_OR_MORE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'One or more chapters not found',
      [LanguageEnum.FRENCH]: 'Un ou plusieurs chapitres non trouvés',
    },
    DUPLICATE_SEQUENCE: {
      [LanguageEnum.ENGLISH]: 'Duplicate sequence numbers are not allowed',
      [LanguageEnum.FRENCH]:
        'Les numéros de séquence en double ne sont pas autorisés',
    },
    SAME_MODULE_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'All chapters must belong to the same module',
      [LanguageEnum.FRENCH]:
        'Tous les chapitres doivent appartenir au même module',
    },
    SEQUENCE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to get next sequence',
      [LanguageEnum.FRENCH]: "Échec de l'obtention de la séquence suivante",
    },
    SUPER_ADMIN_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'School ID is required in request body for super admin',
      [LanguageEnum.FRENCH]:
        "L'ID de l'école est requis dans le corps de la requête pour le super administrateur",
    },
    CHAPTER_TITLE_ALREADY_EXISTS: {
      [LanguageEnum.ENGLISH]:
        'Chapter with this title already exists in the module',
      [LanguageEnum.FRENCH]:
        'Un chapitre avec ce titre existe déjà dans le module',
    },
    LOCKED_REASON_PREVIOUS_CHAPTER: {
      [LanguageEnum.ENGLISH]: 'Complete the previous chapter first',
      [LanguageEnum.FRENCH]: "Terminez d'abord le chapitre précédent",
    },
    LOCKED_REASON_QUIZ_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'Retake and pass the quiz to unlock this chapter',
      [LanguageEnum.FRENCH]:
        'Reprenez et réussissez le quiz pour débloquer ce chapitre',
    },
  },

  // Bibliography Related
  BIBLIOGRAPHY: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Bibliography not found',
      [LanguageEnum.FRENCH]: 'Bibliographie non trouvée',
    },
    NOT_FOUND_DURING_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Bibliography not found during update',
      [LanguageEnum.FRENCH]: 'Bibliographie non trouvée lors de la mise à jour',
    },
    ONE_OR_MORE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'One or more bibliography items not found',
      [LanguageEnum.FRENCH]:
        'Un ou plusieurs éléments de bibliographie non trouvés',
    },
    BIBLIOGRAPHY_ITEMS_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'Bibliography items array is required and must not be empty',
      [LanguageEnum.FRENCH]:
        'Le tableau des éléments de bibliographie est requis et ne doit pas être vide',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create bibliography',
      [LanguageEnum.FRENCH]: 'Échec de la création de la bibliographie',
    },
    UPDATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update bibliography',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour de la bibliographie',
    },
    DELETE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete bibliography',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de la bibliographie',
    },
    RETRIEVE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve bibliography',
      [LanguageEnum.FRENCH]: 'Échec de la récupération de la bibliographie',
    },
    REORDER_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to reorder bibliography items',
      [LanguageEnum.FRENCH]:
        'Échec du réordonnancement des éléments de bibliographie',
    },
    SEQUENCE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to get next sequence',
      [LanguageEnum.FRENCH]: "Échec de l'obtention de la séquence suivante",
    },
    SUPER_ADMIN_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'School ID is required in request body for super admin',
      [LanguageEnum.FRENCH]:
        "L'ID de l'école est requis dans le corps de la requête pour le super administrateur",
    },
    CHAPTER_TITLE_MISMATCH: {
      [LanguageEnum.ENGLISH]: 'Chapter title mismatch in bibliography items',
      [LanguageEnum.FRENCH]:
        'Incompatibilité de titre de chapitre dans les éléments de bibliographie',
    },
    DUPLICATE_SEQUENCE: {
      [LanguageEnum.ENGLISH]: 'Duplicate sequence numbers are not allowed',
      [LanguageEnum.FRENCH]:
        'Les numéros de séquence en double ne sont pas autorisés',
    },
    SAME_CHAPTER_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'All bibliography items must belong to the same chapter',
      [LanguageEnum.FRENCH]:
        'Tous les éléments de bibliographie doivent appartenir au même chapitre',
    },
  },

  // AI Chat Related
  AI_CHAT: {
    SESSION_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'AI session not found',
      [LanguageEnum.FRENCH]: 'Session IA non trouvée',
    },
    SESSION_NOT_FOUND_OR_COMPLETED: {
      [LanguageEnum.ENGLISH]: 'AI session not found or not completed',
      [LanguageEnum.FRENCH]: 'Session IA non trouvée ou non terminée',
    },
    SESSION_ALREADY_COMPLETED: {
      [LanguageEnum.ENGLISH]: 'Session is already completed',
      [LanguageEnum.FRENCH]: 'La session est déjà terminée',
    },
    CANNOT_COMPLETE_CANCELLED: {
      [LanguageEnum.ENGLISH]: 'Cannot complete a cancelled session',
      [LanguageEnum.FRENCH]: 'Impossible de terminer une session annulée',
    },
    CANNOT_ADD_TO_INACTIVE: {
      [LanguageEnum.ENGLISH]: 'Cannot add messages to inactive session',
      [LanguageEnum.FRENCH]:
        "Impossible d'ajouter des messages à une session inactive",
    },
    SUPERVISOR_FEEDBACK_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: "Supervisor's feedback not found",
      [LanguageEnum.FRENCH]: 'Retour du superviseur non trouvé',
    },
  },

  // Community Related
  COMMUNITY: {
    MESSAGE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Message not found',
      [LanguageEnum.FRENCH]: 'Message non trouvé',
    },
    DISCUSSION_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Discussion not found',
      [LanguageEnum.FRENCH]: 'Discussion non trouvée',
    },
    DISCUSSION_NOT_FOUND_OR_NOT_ACTIVE: {
      [LanguageEnum.ENGLISH]: 'Discussion not found or not active',
      [LanguageEnum.FRENCH]: 'Discussion non trouvée ou inactive',
    },
    PARENT_REPLY_NOT_FOUND_OR_NOT_ACTIVE: {
      [LanguageEnum.ENGLISH]: 'Parent reply not found or not active',
      [LanguageEnum.FRENCH]: 'Réponse parent non trouvée ou inactive',
    },
    REPLY_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Reply not found',
      [LanguageEnum.FRENCH]: 'Réponse non trouvée',
    },
    ENTITY_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Entity not found',
      [LanguageEnum.FRENCH]: 'Entité non trouvée',
    },
    INVALID_ENTITY_TYPE: {
      [LanguageEnum.ENGLISH]: 'Invalid entity type',
      [LanguageEnum.FRENCH]: "Type d'entité invalide",
    },
    SUPER_ADMIN_SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'School ID is required in request body for super admin',
      [LanguageEnum.FRENCH]:
        "L'ID de l'école est requis dans le corps de la requête pour le super administrateur",
    },
    ONLY_PROFESSORS_ADMINS_CAN_CREATE_MEETING: {
      [LanguageEnum.ENGLISH]:
        'Only professors and admins can create meeting discussions',
      [LanguageEnum.FRENCH]:
        'Seuls les professeurs et administrateurs peuvent créer des discussions de réunion',
    },
    MEETING_FIELDS_REQUIRED: {
      [LanguageEnum.ENGLISH]:
        'Meeting link, platform, and scheduled time are required for meeting type discussions',
      [LanguageEnum.FRENCH]:
        "Le lien de réunion, la plateforme et l'heure programmée sont requis pour les discussions de type réunion",
    },
    CREATE_DISCUSSION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create discussion',
      [LanguageEnum.FRENCH]: 'Échec de la création de la discussion',
    },
    RETRIEVE_DISCUSSIONS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve discussions',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des discussions',
    },
    RETRIEVE_DISCUSSION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve discussion',
      [LanguageEnum.FRENCH]: 'Échec de la récupération de la discussion',
    },
    CREATE_REPLY_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create reply',
      [LanguageEnum.FRENCH]: 'Échec de la création de la réponse',
    },
    RETRIEVE_REPLIES_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve replies',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des réponses',
    },
    RETRIEVE_SUBREPLIES_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve sub-replies',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des sous-réponses',
    },
    TOGGLE_LIKE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to toggle like',
      [LanguageEnum.FRENCH]: 'Échec du basculement du like',
    },
    TOGGLE_PIN_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to toggle pin',
      [LanguageEnum.FRENCH]: "Échec du basculement de l'épinglage",
    },
    ALREADY_REPORTED: {
      [LanguageEnum.ENGLISH]: 'You have already reported this content',
      [LanguageEnum.FRENCH]: 'Vous avez déjà signalé ce contenu',
    },
    ACCESS_DENIED: {
      [LanguageEnum.ENGLISH]: 'Access denied',
      [LanguageEnum.FRENCH]: 'Accès refusé',
    },
    CAN_ONLY_DELETE_OWN: {
      [LanguageEnum.ENGLISH]: 'You can only delete your own messages',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez supprimer que vos propres messages',
    },
    INVALID_RECEIVER_ROLE: {
      [LanguageEnum.ENGLISH]: 'Invalid receiver role',
      [LanguageEnum.FRENCH]: 'Rôle de destinataire invalide',
    },
    SCHOOL_ID_REQUIRED_STUDENT: {
      [LanguageEnum.ENGLISH]: 'School ID required to fetch student details',
      [LanguageEnum.FRENCH]:
        "Identifiant d'école requis pour récupérer les détails de l'étudiant",
    },
    REPORT_CONTENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to report content',
      [LanguageEnum.FRENCH]: 'Échec du signalement du contenu',
    },
    RETRIEVE_REPORTS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve reports',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des signalements',
    },
    ARCHIVE_DISCUSSION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to archive discussion',
      [LanguageEnum.FRENCH]: "Échec de l'archivage de la discussion",
    },
    RETRIEVE_UNREAD_COUNTS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve unread counts',
      [LanguageEnum.FRENCH]:
        'Échec de la récupération des compteurs de non lus',
    },
    GET_REPORTS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve reports',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des signalements',
    },
    GET_PINNED_DISCUSSIONS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve pinned discussions',
      [LanguageEnum.FRENCH]:
        'Échec de la récupération des discussions épinglées',
    },
    CHECK_PIN_STATUS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to check pin status',
      [LanguageEnum.FRENCH]: "Échec de la vérification du statut d'épinglage",
    },
    GET_MENTIONS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve mentions',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des mentions',
    },
    GET_SCHOOL_MEMBERS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve school members',
      [LanguageEnum.FRENCH]: "Échec de la récupération des membres de l'école",
    },
    LIMIT_VALIDATION: {
      [LanguageEnum.ENGLISH]: 'Limit must be a number between 1 and 100',
      [LanguageEnum.FRENCH]: 'La limite doit être un nombre entre 1 et 100',
    },
    PAGE_VALIDATION: {
      [LanguageEnum.ENGLISH]: 'Page must be a number greater than 0',
      [LanguageEnum.FRENCH]: 'La page doit être un nombre supérieur à 0',
    },
    STUDENTS_CANNOT_EXPORT_DISCUSSIONS: {
      [LanguageEnum.ENGLISH]: 'Students cannot export discussions',
      [LanguageEnum.FRENCH]:
        'Les étudiants ne peuvent pas exporter les discussions',
    },
    NO_DISCUSSIONS_FOUND_FOR_EXPORT: {
      [LanguageEnum.ENGLISH]: 'No discussions found for export',
      [LanguageEnum.FRENCH]: "Aucune discussion trouvée pour l'export",
    },
    EXPORT_DISCUSSIONS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to export discussions',
      [LanguageEnum.FRENCH]: "Échec de l'export des discussions",
    },
    // Forum Attachment Related Error Messages
    FORUM_ATTACHMENT_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Forum attachment not found',
      [LanguageEnum.FRENCH]: 'Pièce jointe du forum non trouvée',
    },
    CREATE_FORUM_ATTACHMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create forum attachment',
      [LanguageEnum.FRENCH]: 'Échec de la création de la pièce jointe du forum',
    },
    GET_FORUM_ATTACHMENTS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve forum attachments',
      [LanguageEnum.FRENCH]:
        'Échec de la récupération des pièces jointes du forum',
    },
    DELETE_FORUM_ATTACHMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete forum attachment',
      [LanguageEnum.FRENCH]:
        'Échec de la suppression de la pièce jointe du forum',
    },
    CANNOT_DELETE_FORUM_ATTACHMENT: {
      [LanguageEnum.ENGLISH]: 'You cannot delete this forum attachment',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez pas supprimer cette pièce jointe du forum',
    },
    GET_USER_ATTACHMENTS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve user attachments',
      [LanguageEnum.FRENCH]:
        "Échec de la récupération des pièces jointes de l'utilisateur",
    },
    GET_ATTACHMENT_STATS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve attachment statistics',
      [LanguageEnum.FRENCH]:
        'Échec de la récupération des statistiques des pièces jointes',
    },
    // Reply Operation Related Error Messages
    ONLY_CREATOR_OR_ADMIN_CAN_DELETE: {
      [LanguageEnum.ENGLISH]:
        'Only the creator or administrators can delete this content',
      [LanguageEnum.FRENCH]:
        'Seul le créateur ou les administrateurs peuvent supprimer ce contenu',
    },
    ERROR_DELETING_REPLY: {
      [LanguageEnum.ENGLISH]: 'Failed to delete reply',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de la réponse',
    },
    UPDATE_REPLY_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to update reply',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour de la réponse',
    },
    CANNOT_EDIT_REPLY: {
      [LanguageEnum.ENGLISH]: 'You cannot edit this reply',
      [LanguageEnum.FRENCH]: 'Vous ne pouvez pas modifier cette réponse',
    },
    CANNOT_EDIT_DISCUSSION: {
      [LanguageEnum.ENGLISH]: 'You cannot edit this discussion',
      [LanguageEnum.FRENCH]: 'Vous ne pouvez pas modifier cette discussion',
    },
    DELETE_DISCUSSION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete discussion',
      [LanguageEnum.FRENCH]: 'Échec de la suppression de la discussion',
    },
    GET_REPLY_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve reply',
      [LanguageEnum.FRENCH]: 'Échec de la récupération de la réponse',
    },
    DISCUSSIONS_EXPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussions exported successfully',
      [LanguageEnum.FRENCH]: 'Discussions exportées avec succès',
    },
    LIKED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Content liked successfully',
      [LanguageEnum.FRENCH]: 'Contenu aimé avec succès',
    },
    UNLIKED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Content unliked successfully',
      [LanguageEnum.FRENCH]: 'Contenu retiré des likes avec succès',
    },
    PINNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion pinned successfully',
      [LanguageEnum.FRENCH]: 'Discussion épinglée avec succès',
    },
    UNPINNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion unpinned successfully',
      [LanguageEnum.FRENCH]: 'Discussion désépinglée avec succès',
    },
    DISCUSSION_ARCHIVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion archived successfully',
      [LanguageEnum.FRENCH]: 'Discussion archivée avec succès',
    },
    UNREAD_COUNTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Unread counts retrieved successfully',
      [LanguageEnum.FRENCH]: 'Compteurs de non lus récupérés avec succès',
    },
    PIN_STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Pin status retrieved successfully',
      [LanguageEnum.FRENCH]: "Statut d'épinglage récupéré avec succès",
    },
    LIKE_STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Like status retrieved successfully',
      [LanguageEnum.FRENCH]: 'Statut de like récupéré avec succès',
    },
    LIKED_BY_USERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Liked by users retrieved successfully',
      [LanguageEnum.FRENCH]: 'Utilisateurs ayant aimé récupérés avec succès',
    },
    SCHOOL_MEMBERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School members retrieved successfully',
      [LanguageEnum.FRENCH]: "Membres de l'école récupérés avec succès",
    },
    FORUM_ATTACHMENT_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachment created successfully',
      [LanguageEnum.FRENCH]: 'Pièce jointe du forum créée avec succès',
    },
    FORUM_ATTACHMENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachments retrieved successfully',
      [LanguageEnum.FRENCH]: 'Pièces jointes du forum récupérées avec succès',
    },
    FORUM_ATTACHMENT_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachment deleted successfully',
      [LanguageEnum.FRENCH]: 'Pièce jointe du forum supprimée avec succès',
    },
    REPORTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reports retrieved successfully',
      [LanguageEnum.FRENCH]: 'Signalements récupérés avec succès',
    },
    TAGS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Tags retrieved successfully',
      [LanguageEnum.FRENCH]: 'Tags récupérés avec succès',
    },
    ERROR_GETTING_TAGS: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve tags',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des tags',
    },
  },

  // Chat Related
  CHAT: {
    SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'School ID is required',
      [LanguageEnum.FRENCH]: "L'identifiant de l'école est requis",
    },
    MESSAGE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Message not found',
      [LanguageEnum.FRENCH]: 'Message non trouvé',
    },
    CAN_ONLY_DELETE_OWN: {
      [LanguageEnum.ENGLISH]: 'You can only delete your own messages',
      [LanguageEnum.FRENCH]:
        'Vous ne pouvez supprimer que vos propres messages',
    },
    INVALID_RECEIVER_ROLE: {
      [LanguageEnum.ENGLISH]: 'Invalid receiver role',
      [LanguageEnum.FRENCH]: 'Rôle de destinataire invalide',
    },
    RECEIVER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: '{role} not found',
      [LanguageEnum.FRENCH]: '{role} non trouvé',
    },
    SCHOOL_ID_REQUIRED_STUDENT: {
      [LanguageEnum.ENGLISH]: 'School ID required to fetch student details',
      [LanguageEnum.FRENCH]:
        "Identifiant d'école requis pour récupérer les détails de l'étudiant",
    },
    LIMIT_VALIDATION: {
      [LanguageEnum.ENGLISH]: 'Limit must be a number between 1 and 100',
      [LanguageEnum.FRENCH]: 'La limite doit être un nombre entre 1 et 100',
    },
    PAGE_VALIDATION: {
      [LanguageEnum.ENGLISH]: 'Page must be a number greater than 0',
      [LanguageEnum.FRENCH]: 'La page doit être un nombre supérieur à 0',
    },
    CREATE_MESSAGE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create message',
      [LanguageEnum.FRENCH]: 'Échec de la création du message',
    },
    RETRIEVE_MESSAGES_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve messages',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des messages',
    },
    RETRIEVE_CONVERSATIONS_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve conversations',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des conversations',
    },
    MARK_READ_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to mark messages as read',
      [LanguageEnum.FRENCH]: 'Échec du marquage des messages comme lus',
    },
    DELETE_MESSAGE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to delete message',
      [LanguageEnum.FRENCH]: 'Échec de la suppression du message',
    },
    USER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'User not found',
      [LanguageEnum.FRENCH]: 'Utilisateur non trouvé',
    },
  },

  // Learning Logs Related
  LEARNING_LOGS: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Learning log not found',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage non trouvé",
    },
    LEARNING_LOG_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Learning log not found',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage non trouvé",
    },
    REVIEWER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Reviewer not found',
      [LanguageEnum.FRENCH]: 'Réviseur non trouvé',
    },
    STUDENTS_CANNOT_REVIEW: {
      [LanguageEnum.ENGLISH]: 'Students cannot review learning logs',
      [LanguageEnum.FRENCH]:
        "Les étudiants ne peuvent pas réviser les journaux d'apprentissage",
    },
    STUDENTS_CANNOT_REVIEW_LEARNING_LOGS: {
      [LanguageEnum.ENGLISH]: 'Students cannot review learning logs',
      [LanguageEnum.FRENCH]:
        "Les étudiants ne peuvent pas réviser les journaux d'apprentissage",
    },
    NO_LOGS_FOR_EXPORT: {
      [LanguageEnum.ENGLISH]: 'No learning logs found for export',
      [LanguageEnum.FRENCH]:
        "Aucun journal d'apprentissage trouvé pour l'export",
    },
    NO_LEARNING_LOGS_FOUND_FOR_EXPORT: {
      [LanguageEnum.ENGLISH]: 'No learning logs found for export',
      [LanguageEnum.FRENCH]:
        "Aucun journal d'apprentissage trouvé pour l'export",
    },
    INVALID_FILENAME: {
      [LanguageEnum.ENGLISH]: 'Invalid filename',
      [LanguageEnum.FRENCH]: 'Nom de fichier invalide',
    },
    FILE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'File not found or could not be downloaded',
      [LanguageEnum.FRENCH]: 'Fichier non trouvé ou impossible à télécharger',
    },
    ALREADY_REVIEWED: {
      [LanguageEnum.ENGLISH]: 'You have already reviewed this learning log',
      [LanguageEnum.FRENCH]: "Vous avez déjà révisé ce journal d'apprentissage",
    },
    USER_SCHOOL_ID_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'User school ID not found',
      [LanguageEnum.FRENCH]: "Identifiant d'école de l'utilisateur non trouvé",
    },
    SCHOOL_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found',
      [LanguageEnum.FRENCH]: 'École non trouvée',
    },
    EXPORT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to export learning logs',
      [LanguageEnum.FRENCH]: "Échec de l'export des journaux d'apprentissage",
    },
    RETRIEVE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve learning logs',
      [LanguageEnum.FRENCH]:
        "Échec de la récupération des journaux d'apprentissage",
    },
    CREATE_REVIEW_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create learning log review',
      [LanguageEnum.FRENCH]:
        "Échec de la création de la révision du journal d'apprentissage",
    },
    RETRIEVE_REVIEW_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve learning log review',
      [LanguageEnum.FRENCH]:
        "Échec de la récupération de la révision du journal d'apprentissage",
    },
  },

  // Notifications Related
  NOTIFICATIONS: {
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Notification not found',
      [LanguageEnum.FRENCH]: 'Notification non trouvée',
    },
    CREATE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to create notification',
      [LanguageEnum.FRENCH]: 'Échec de la création de la notification',
    },
    RETRIEVE_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve notifications',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des notifications',
    },
    MARK_READ_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to mark notification as read',
      [LanguageEnum.FRENCH]: 'Échec du marquage de la notification comme lue',
    },
    MARK_ALL_READ_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to mark notifications as read',
      [LanguageEnum.FRENCH]: 'Échec du marquage des notifications comme lues',
    },
    UNREAD_COUNT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to get unread count',
      [LanguageEnum.FRENCH]: "Échec de l'obtention du nombre de non lus",
    },
    NOTIFICATIONS_MARKED_READ_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notifications marked as read successfully',
      [LanguageEnum.FRENCH]: 'Notifications marquées comme lues avec succès',
    },
    NOTIFICATIONS_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notifications created successfully',
      [LanguageEnum.FRENCH]: 'Notifications créées avec succès',
    },
    UNREAD_COUNT_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Unread count retrieved successfully',
      [LanguageEnum.FRENCH]: 'Nombre de non lus récupéré avec succès',
    },
  },

  // General Errors
  GENERAL: {
    OPERATION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Operation failed',
      [LanguageEnum.FRENCH]: 'Opération échouée',
    },
    VALIDATION_FAILED: {
      [LanguageEnum.ENGLISH]: 'Validation failed',
      [LanguageEnum.FRENCH]: 'Validation échouée',
    },
    UNAUTHORIZED: {
      [LanguageEnum.ENGLISH]: 'Unauthorized',
      [LanguageEnum.FRENCH]: 'Non autorisé',
    },
    FORBIDDEN: {
      [LanguageEnum.ENGLISH]: 'Forbidden',
      [LanguageEnum.FRENCH]: 'Interdit',
    },
    NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Not found',
      [LanguageEnum.FRENCH]: 'Non trouvé',
    },
    BAD_REQUEST: {
      [LanguageEnum.ENGLISH]: 'Bad request',
      [LanguageEnum.FRENCH]: 'Requête invalide',
    },
    INTERNAL_SERVER_ERROR: {
      [LanguageEnum.ENGLISH]: 'Internal server error',
      [LanguageEnum.FRENCH]: 'Erreur interne du serveur',
    },
  },

  // Progress Related
  PROGRESS: {
    ONLY_STUDENTS_CAN_START_MODULES: {
      [LanguageEnum.ENGLISH]: 'Only students can start modules',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent commencer des modules',
    },
    STUDENT_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Student not found',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé',
    },
    MODULE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Module not found',
      [LanguageEnum.FRENCH]: 'Module non trouvé',
    },
    ONLY_STUDENTS_CAN_START_CHAPTERS: {
      [LanguageEnum.ENGLISH]: 'Only students can start chapters',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent commencer des chapitres',
    },
    CHAPTER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Chapter not found',
      [LanguageEnum.FRENCH]: 'Chapitre non trouvé',
    },
    FAILED_TO_START_CHAPTER: {
      [LanguageEnum.ENGLISH]: 'Failed to start chapter',
      [LanguageEnum.FRENCH]: 'Échec du démarrage du chapitre',
    },
    ONLY_STUDENTS_CAN_MARK_CHAPTERS_AS_COMPLETE: {
      [LanguageEnum.ENGLISH]: 'Only students can mark chapters as complete',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent marquer les chapitres comme terminés',
    },
    FAILED_TO_MARK_CHAPTER_AS_COMPLETE: {
      [LanguageEnum.ENGLISH]: 'Failed to mark chapter as complete',
      [LanguageEnum.FRENCH]: 'Échec de la validation du chapitre comme terminé',
    },
    ONLY_STUDENTS_CAN_START_QUIZ_ATTEMPTS: {
      [LanguageEnum.ENGLISH]: 'Only students can start quiz attempts',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent commencer des tentatives de quiz',
    },
    QUIZ_GROUP_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Quiz group not found',
      [LanguageEnum.FRENCH]: 'Groupe de quiz non trouvé',
    },
    QUIZ_ATTEMPT_ALREADY_IN_PROGRESS: {
      [LanguageEnum.ENGLISH]: 'Quiz attempt already in progress',
      [LanguageEnum.FRENCH]: 'Une tentative de quiz est déjà en cours',
    },
    SEQUENCE_ACCESS_DENIED: {
      [LanguageEnum.ENGLISH]: 'Please complete the previous module first to start this module',
      [LanguageEnum.FRENCH]: 'Veuillez d\'abord terminer le module précédent pour commencer ce module',
    },
  },

  // Quiz Related
  QUIZ: {
    QUIZ_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Quiz not found',
      [LanguageEnum.FRENCH]: 'Quiz non trouvé',
    },
    FAILED_TO_START_QUIZ_ATTEMPT: {
      [LanguageEnum.ENGLISH]: 'Failed to start quiz attempt',
      [LanguageEnum.FRENCH]: 'Échec du démarrage de la tentative de quiz',
    },
    ONLY_STUDENTS_CAN_SUBMIT_QUIZ_ANSWERS: {
      [LanguageEnum.ENGLISH]: 'Only students can submit quiz answers',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent soumettre des réponses au quiz',
    },
    NO_IN_PROGRESS_QUIZ_ATTEMPT_FOUND: {
      [LanguageEnum.ENGLISH]: 'No in-progress quiz attempt found',
      [LanguageEnum.FRENCH]: 'Aucune tentative de quiz en cours trouvée',
    },
    QUIZ_ANSWERS_SUBMITTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz answers submitted successfully',
      [LanguageEnum.FRENCH]: 'Réponses au quiz soumises avec succès',
    },
    QUIZ_ATTEMPT_STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz attempt started successfully',
      [LanguageEnum.FRENCH]: 'Tentative de quiz commencée avec succès',
    },
    ONLY_STUDENTS_CAN_VIEW_QUIZ_ATTEMPTS: {
      [LanguageEnum.ENGLISH]: 'Only students can view quiz attempts',
      [LanguageEnum.FRENCH]:
        'Seuls les étudiants peuvent voir les tentatives de quiz',
    },
    QUIZ_ATTEMPTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz attempts retrieved successfully',
      [LanguageEnum.FRENCH]: 'Tentatives de quiz récupérées avec succès',
    },
    FAILED_TO_RETRIEVE_QUIZ_ATTEMPTS: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve quiz attempts',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des tentatives de quiz',
    },
    SCHOOL_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found',
      [LanguageEnum.FRENCH]: 'École non trouvée',
    },
    MODULE_ID_REQUIRED_WHEN_TYPE_IS_MODULE: {
      [LanguageEnum.ENGLISH]: 'Module ID is required when type is MODULE',
      [LanguageEnum.FRENCH]:
        "L'ID du module est requis lorsque le type est MODULE",
    },
    CHAPTER_ID_REQUIRED_WHEN_TYPE_IS_CHAPTER: {
      [LanguageEnum.ENGLISH]: 'Chapter ID is required when type is CHAPTER',
      [LanguageEnum.FRENCH]:
        "L'ID du chapitre est requis lorsque le type est CHAPTER",
    },
    MODULE_ID_REQUIRED_WHEN_TYPE_IS_ANCHOR_TAG: {
      [LanguageEnum.ENGLISH]: 'Module ID is required when type is ANCHOR_TAG',
      [LanguageEnum.FRENCH]:
        "L'ID du module est requis lorsque le type est ANCHOR_TAG",
    },
    QUIZ_GROUP_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Quiz group not found',
      [LanguageEnum.FRENCH]: 'Groupe de quiz non trouvé',
    },
    MODULE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Module not found',
      [LanguageEnum.FRENCH]: 'Module non trouvé',
    },
    CHAPTER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Chapter not found',
      [LanguageEnum.FRENCH]: 'Chapitre non trouvé',
    },
    INVALID_QUIZ_IDS: {
      [LanguageEnum.ENGLISH]: 'Invalid quiz IDs provided',
      [LanguageEnum.FRENCH]: 'IDs de quiz invalides fournis',
    },
    // Analytics Related
    ONLY_ADMINS_CAN_ACCESS_ANALYTICS: {
      [LanguageEnum.ENGLISH]: 'Only admins can access quiz analytics',
      [LanguageEnum.FRENCH]:
        'Seuls les administrateurs peuvent accéder aux analyses de quiz',
    },
    STUDENT_ID_REQUIRED_FOR_ADMIN_ACCESS: {
      [LanguageEnum.ENGLISH]: 'Student ID is required for admin access',
      [LanguageEnum.FRENCH]:
        "L'ID de l'étudiant est requis pour l'accès administrateur",
    },
    ONLY_STUDENTS_ADMINS_PROFESSORS_CAN_ACCESS: {
      [LanguageEnum.ENGLISH]:
        'Only students, school admins, and professors can access this endpoint',
      [LanguageEnum.FRENCH]:
        "Seuls les étudiants, administrateurs d'école et professeurs peuvent accéder à ce point de terminaison",
    },
    ANALYTICS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz analytics retrieved successfully',
      [LanguageEnum.FRENCH]: 'Analyses de quiz récupérées avec succès',
    },
    ANALYTICS_EXPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz analytics exported successfully',
      [LanguageEnum.FRENCH]: 'Analyses de quiz exportées avec succès',
    },
    UNSUPPORTED_EXPORT_FORMAT: {
      [LanguageEnum.ENGLISH]: 'Unsupported export format',
      [LanguageEnum.FRENCH]: "Format d'exportation non pris en charge",
    },
    BIBLIOGRAPHY_ID_REQUIRED_WHEN_TYPE_IS_ANCHOR_TAG: {
      [LanguageEnum.ENGLISH]:
        'Bibliography ID is required when type is ANCHOR_TAG',
      [LanguageEnum.FRENCH]:
        "L'ID de la bibliographie est requis lorsque le type est ANCHOR_TAG",
    },
    FAILED_TO_CREATE_QUIZ_GROUP: {
      [LanguageEnum.ENGLISH]: 'Failed to create quiz group',
      [LanguageEnum.FRENCH]: 'Échec de la création du groupe de quiz',
    },
    FAILED_TO_UPDATE_QUIZ_GROUP: {
      [LanguageEnum.ENGLISH]: 'Failed to update quiz group',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du groupe de quiz',
    },
    FAILED_TO_DELETE_QUIZ_GROUP: {
      [LanguageEnum.ENGLISH]: 'Failed to delete quiz group',
      [LanguageEnum.FRENCH]: 'Échec de la suppression du groupe de quiz',
    },
    FAILED_TO_CREATE_QUIZ: {
      [LanguageEnum.ENGLISH]: 'Failed to create quiz',
      [LanguageEnum.FRENCH]: 'Échec de la création du quiz',
    },
    FAILED_TO_UPDATE_QUIZ: {
      [LanguageEnum.ENGLISH]: 'Failed to update quiz',
      [LanguageEnum.FRENCH]: 'Échec de la mise à jour du quiz',
    },
    FAILED_TO_DELETE_QUIZ: {
      [LanguageEnum.ENGLISH]: 'Failed to delete quiz',
      [LanguageEnum.FRENCH]: 'Échec de la suppression du quiz',
    },
    FAILED_TO_NOTIFY_STUDENTS: {
      [LanguageEnum.ENGLISH]: 'Failed to notify students about new quiz',
      [LanguageEnum.FRENCH]:
        'Échec de la notification des étudiants du nouveau quiz',
    },
    INVALID_ANSWERS: {
      [LanguageEnum.ENGLISH]:
        'Invalid answers provided. All answers must be from the options array.',
      [LanguageEnum.FRENCH]:
        'Réponses invalides fournies. Toutes les réponses doivent provenir du tableau des options.',
    },
    QUIZ_GROUP_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'Quiz group ID is required',
      [LanguageEnum.FRENCH]: "L'ID du groupe de quiz est requis",
    },
  },

  // Anchor Tag Related
  ANCHOR_TAG: {
    SCHOOL_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found',
      [LanguageEnum.FRENCH]: 'École non trouvée',
    },
    MODULE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Module not found',
      [LanguageEnum.FRENCH]: 'Module non trouvé',
    },
    CHAPTER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Chapter not found',
      [LanguageEnum.FRENCH]: 'Chapitre non trouvé',
    },
    BIBLIOGRAPHY_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Bibliography not found',
      [LanguageEnum.FRENCH]: 'Bibliographie non trouvée',
    },
    DUPLICATE_TITLE_IN_BIBLIOGRAPHY: {
      [LanguageEnum.ENGLISH]:
        'An anchor tag with this title already exists in this bibliography',
      [LanguageEnum.FRENCH]:
        "Un tag d'ancrage avec ce titre existe déjà dans cette bibliographie",
    },
    QUIZ_GROUP_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Quiz group not found',
      [LanguageEnum.FRENCH]: 'Groupe de quiz non trouvé',
    },
    ANCHOR_TAG_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Anchor tag not found',
      [LanguageEnum.FRENCH]: "Tag d'ancrage non trouvé",
    },
    INVALID_QUIZ_IDS: {
      [LanguageEnum.ENGLISH]: 'Invalid quiz IDs provided',
      [LanguageEnum.FRENCH]: 'IDs de quiz invalides fournis',
    },
    TIMESTAMP_REQUIRED_FOR_VIDEO: {
      [LanguageEnum.ENGLISH]: 'Timestamp is required for video content',
      [LanguageEnum.FRENCH]: "L'horodatage est requis pour le contenu vidéo",
    },
    PAGE_NUMBER_REQUIRED_FOR_PDF: {
      [LanguageEnum.ENGLISH]: 'Page number is required for PDF content',
      [LanguageEnum.FRENCH]: 'Le numéro de page est requis pour le contenu PDF',
    },
    SLIDE_NUMBER_REQUIRED_FOR_SLIDE: {
      [LanguageEnum.ENGLISH]: 'Slide number is required for slide content',
      [LanguageEnum.FRENCH]:
        'Le numéro de diapositive est requis pour le contenu de diapositive',
    },
    NO_IN_PROGRESS_ATTEMPT_FOUND: {
      [LanguageEnum.ENGLISH]: 'No in-progress anchor tag attempt found',
      [LanguageEnum.FRENCH]:
        "Aucune tentative de tag d'ancrage en cours trouvée",
    },
    MANDATORY_ANCHOR_TAG_CANNOT_BE_SKIPPED: {
      [LanguageEnum.ENGLISH]: 'Mandatory anchor tags cannot be skipped',
      [LanguageEnum.FRENCH]:
        "Les tags d'ancrage obligatoires ne peuvent pas être ignorés",
    },
    ANCHOR_TAG_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag created successfully',
      [LanguageEnum.FRENCH]: "Tag d'ancrage créé avec succès",
    },
    ANCHOR_TAG_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag updated successfully',
      [LanguageEnum.FRENCH]: "Tag d'ancrage mis à jour avec succès",
    },
    ANCHOR_TAG_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag deleted successfully',
      [LanguageEnum.FRENCH]: "Tag d'ancrage supprimé avec succès",
    },
    ANCHOR_TAGS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tags retrieved successfully',
      [LanguageEnum.FRENCH]: "Tags d'ancrage récupérés avec succès",
    },
    ANCHOR_TAG_ATTEMPT_STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag attempt started successfully',
      [LanguageEnum.FRENCH]: "Tentative de tag d'ancrage commencée avec succès",
    },
    ANCHOR_TAG_ANSWER_SUBMITTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag answer submitted successfully',
      [LanguageEnum.FRENCH]: "Réponse au tag d'ancrage soumise avec succès",
    },
    ANCHOR_TAG_SKIPPED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag skipped successfully',
      [LanguageEnum.FRENCH]: "Tag d'ancrage ignoré avec succès",
    },
    STUDENT_ATTEMPTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]:
        'Student anchor tag attempts retrieved successfully',
      [LanguageEnum.FRENCH]:
        "Tentatives de tags d'ancrage de l'étudiant récupérées avec succès",
    },
    NO_MANDATORY_ANCHOR_TAGS_FOUND: {
      [LanguageEnum.ENGLISH]:
        'No mandatory anchor tags found for this bibliography',
      [LanguageEnum.FRENCH]:
        "Aucun tag d'ancrage obligatoire trouvé pour cette bibliographie",
    },
    NO_STUDENTS_FOUND_IN_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'No students found in school',
      [LanguageEnum.FRENCH]: "Aucun étudiant trouvé dans l'école",
    },
    MISSED_ANCHOR_TAG_NOTIFICATIONS_PROCESSED: {
      [LanguageEnum.ENGLISH]:
        'Missed anchor tag notifications processed successfully',
      [LanguageEnum.FRENCH]:
        "Notifications de tags d'ancrage manqués traitées avec succès",
    },
    NOTIFICATION_SENT_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notification sent successfully',
      [LanguageEnum.FRENCH]: 'Notification envoyée avec succès',
    },
    FAILED_TO_SEND_NOTIFICATION: {
      [LanguageEnum.ENGLISH]: 'Failed to send notification',
      [LanguageEnum.FRENCH]: "Échec de l'envoi de la notification",
    },
    // Analytics Related
    ONLY_ADMINS_CAN_ACCESS_ANALYTICS: {
      [LanguageEnum.ENGLISH]: 'Only admins can access anchor tag analytics',
      [LanguageEnum.FRENCH]:
        "Seuls les administrateurs peuvent accéder aux analyses de tags d'ancrage",
    },
    STUDENT_ID_REQUIRED_FOR_ADMIN_ACCESS: {
      [LanguageEnum.ENGLISH]: 'Student ID is required for admin access',
      [LanguageEnum.FRENCH]:
        "L'ID de l'étudiant est requis pour l'accès administrateur",
    },
    ONLY_STUDENTS_ADMINS_PROFESSORS_CAN_ACCESS: {
      [LanguageEnum.ENGLISH]:
        'Only students, school admins, and professors can access this endpoint',
      [LanguageEnum.FRENCH]:
        "Seuls les étudiants, administrateurs d'école et professeurs peuvent accéder à ce point de terminaison",
    },
    ANALYTICS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag analytics retrieved successfully',
      [LanguageEnum.FRENCH]:
        "Analyses de tags d'ancrage récupérées avec succès",
    },
    ANALYTICS_EXPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Anchor tag analytics exported successfully',
      [LanguageEnum.FRENCH]: "Analyses de tags d'ancrage exportées avec succès",
    },
    UNSUPPORTED_EXPORT_FORMAT: {
      [LanguageEnum.ENGLISH]: 'Unsupported export format',
      [LanguageEnum.FRENCH]: "Format d'exportation non pris en charge",
    },
    NO_DATA_AVAILABLE: {
      [LanguageEnum.ENGLISH]: 'No data available for the specified criteria',
      [LanguageEnum.FRENCH]:
        'Aucune donnée disponible pour les critères spécifiés',
    },
    DUPLICATE_SEQUENCE_NUMBERS: {
      [LanguageEnum.ENGLISH]: 'Duplicate sequence numbers are not allowed',
      [LanguageEnum.FRENCH]:
        'Les numéros de séquence en double ne sont pas autorisés',
    },
    SEQUENCE_ACCESS_DENIED: {
      [LanguageEnum.ENGLISH]: 'Please complete the previous module first to start this module',
      [LanguageEnum.FRENCH]: 'Veuillez d\'abord terminer le module précédent pour commencer ce module',
    },
  },

  // School Admin Related
  SCHOOL_ADMIN: {
    SCHOOL_ADMIN_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School admin created successfully',
      [LanguageEnum.FRENCH]: "Administrateur d'école créé avec succès",
    },
    FAILED_TO_CREATE_SCHOOL_ADMIN: {
      [LanguageEnum.ENGLISH]: 'Failed to create school admin',
      [LanguageEnum.FRENCH]: "Échec de la création de l'administrateur d'école",
    },
    DASHBOARD_INFORMATION_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Dashboard information retrieved successfully',
      [LanguageEnum.FRENCH]:
        'Informations du tableau de bord récupérées avec succès',
    },
    USER_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'User not found',
      [LanguageEnum.FRENCH]: 'Utilisateur non trouvé',
    },
    INVALID_USER_TYPE_FOR_PASSWORD_RESET: {
      [LanguageEnum.ENGLISH]: 'Invalid user type for password reset',
      [LanguageEnum.FRENCH]:
        "Type d'utilisateur invalide pour la réinitialisation du mot de passe",
    },
    INVALID_OLD_PASSWORD: {
      [LanguageEnum.ENGLISH]: 'Invalid old password',
      [LanguageEnum.FRENCH]: 'Ancien mot de passe invalide',
    },
    PASSWORD_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Password updated successfully',
      [LanguageEnum.FRENCH]: 'Mot de passe mis à jour avec succès',
    },
    INVALID_USER_TYPE_FOR_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Invalid user type for update',
      [LanguageEnum.FRENCH]: "Type d'utilisateur invalide pour la mise à jour",
    },
    INVALID_USER_TYPE: {
      [LanguageEnum.ENGLISH]: 'Invalid user type',
      [LanguageEnum.FRENCH]: "Type d'utilisateur invalide",
    },
    UNAUTHORIZED_UPDATE: {
      [LanguageEnum.ENGLISH]: 'Unauthorized to update this school admin',
      [LanguageEnum.FRENCH]:
        "Non autorisé à mettre à jour cet administrateur d'école",
    },
    UNAUTHORIZED_ACCESS: {
      [LanguageEnum.ENGLISH]: 'Unauthorized access',
      [LanguageEnum.FRENCH]: 'Accès non autorisé',
    },
    CANNOT_UPDATE_STATUS_OR_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Cannot update status or school assignment',
      [LanguageEnum.FRENCH]:
        "Impossible de mettre à jour le statut ou l'affectation d'école",
    },
    CANNOT_UPDATE_SCHOOL: {
      [LanguageEnum.ENGLISH]: 'Cannot update school assignment',
      [LanguageEnum.FRENCH]: "Impossible de mettre à jour l'affectation d'école",
    },
    NOT_FOUND_AFTER_UPDATE: {
      [LanguageEnum.ENGLISH]: 'School admin not found after update',
      [LanguageEnum.FRENCH]:
        "Administrateur d'école non trouvé après la mise à jour",
    },
    UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School admin updated successfully',
      [LanguageEnum.FRENCH]: "Administrateur d'école mis à jour avec succès",
    },
    RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School admin retrieved successfully',
      [LanguageEnum.FRENCH]: "Administrateur d'école récupéré avec succès",
    },
    NO_SCHOOL_ADMINS_FOUND: {
      [LanguageEnum.ENGLISH]: 'No school admins found',
      [LanguageEnum.FRENCH]: "Aucun administrateur d'école trouvé",
    },
    SCHOOL_ADMINS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School admins retrieved successfully',
      [LanguageEnum.FRENCH]: "Administrateurs d'école récupérés avec succès",
    },
    ALL_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'All school admins retrieved successfully',
      [LanguageEnum.FRENCH]:
        "Tous les administrateurs d'école récupérés avec succès",
    },
    DASHBOARD_STATISTICS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Dashboard statistics retrieved successfully',
      [LanguageEnum.FRENCH]:
        'Statistiques du tableau de bord récupérées avec succès',
    },
    SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'School ID is required for school admin',
      [LanguageEnum.FRENCH]:
        "L'identifiant de l'école est requis pour l'administrateur d'école",
    },
  },

  // Simulation Related
  SIMULATION: {
    UNAUTHORIZED_ROLE: {
      [LanguageEnum.ENGLISH]: 'Only Teachers and Administrators can use student view simulation',
      [LanguageEnum.FRENCH]: "Seuls les enseignants et les administrateurs peuvent utiliser la simulation de vue étudiant",
    },
    ALREADY_IN_SIMULATION: {
      [LanguageEnum.ENGLISH]: 'You are already in simulation mode. Please end the current simulation first.',
      [LanguageEnum.FRENCH]: "Vous êtes déjà en mode simulation. Veuillez d'abord terminer la simulation actuelle.",
    },
    ACTIVE_SESSION_EXISTS: {
      [LanguageEnum.ENGLISH]: 'An active simulation session already exists. Please end it before starting a new one.',
      [LanguageEnum.FRENCH]: "Une session de simulation active existe déjà. Veuillez la terminer avant d'en commencer une nouvelle.",
    },
    SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'School ID is required for super admin to start simulation',
      [LanguageEnum.FRENCH]: "L'identifiant de l'école est requis pour que le super administrateur puisse démarrer la simulation",
    },
    SCHOOL_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found for simulation',
      [LanguageEnum.FRENCH]: "École non trouvée pour la simulation",
    },
    NOT_IN_SIMULATION: {
      [LanguageEnum.ENGLISH]: 'You are not currently in simulation mode',
      [LanguageEnum.FRENCH]: "Vous n'êtes pas actuellement en mode simulation",
    },
    SESSION_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Simulation session not found',
      [LanguageEnum.FRENCH]: "Session de simulation non trouvée",
    },
    SESSION_ALREADY_ENDED: {
      [LanguageEnum.ENGLISH]: 'This simulation session has already ended',
      [LanguageEnum.FRENCH]: "Cette session de simulation est déjà terminée",
    },
    WRITE_BLOCKED: {
      [LanguageEnum.ENGLISH]: 'Write operations are not allowed in simulation mode. This is a read-only view.',
      [LanguageEnum.FRENCH]: "Les opérations d'écriture ne sont pas autorisées en mode simulation. Ceci est une vue en lecture seule.",
    },
    INVALID_SESSION: {
      [LanguageEnum.ENGLISH]: 'Invalid simulation session',
      [LanguageEnum.FRENCH]: "Session de simulation invalide",
    },
  },

  // Enrollment Related
  ENROLLMENT: {
    SCHOOL_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'School not found',
      [LanguageEnum.FRENCH]: 'École non trouvée',
    },
    STUDENT_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Student not found',
      [LanguageEnum.FRENCH]: 'Étudiant non trouvé',
    },
    MODULE_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Module not found',
      [LanguageEnum.FRENCH]: 'Module non trouvé',
    },
    MODULE_NOT_PUBLISHED: {
      [LanguageEnum.ENGLISH]: 'Module is not published and cannot be enrolled',
      [LanguageEnum.FRENCH]: "Le module n'est pas publié et ne peut pas être inscrit",
    },
    ALREADY_ENROLLED: {
      [LanguageEnum.ENGLISH]: 'Student is already enrolled in this module',
      [LanguageEnum.FRENCH]: 'L\'étudiant est déjà inscrit à ce module',
    },
    ENROLLMENT_NOT_FOUND: {
      [LanguageEnum.ENGLISH]: 'Enrollment not found',
      [LanguageEnum.FRENCH]: 'Inscription non trouvée',
    },
    ENROLLMENT_ALREADY_WITHDRAWN: {
      [LanguageEnum.ENGLISH]: 'Enrollment has already been withdrawn',
      [LanguageEnum.FRENCH]: 'L\'inscription a déjà été retirée',
    },
    ENROLLMENT_ALREADY_COMPLETED: {
      [LanguageEnum.ENGLISH]: 'Enrollment has already been completed',
      [LanguageEnum.FRENCH]: 'L\'inscription a déjà été terminée',
    },
    NO_MODULES_FOR_YEAR: {
      [LanguageEnum.ENGLISH]: 'No modules found for the specified academic year',
      [LanguageEnum.FRENCH]: 'Aucun module trouvé pour l\'année académique spécifiée',
    },
    SCHOOL_ID_REQUIRED: {
      [LanguageEnum.ENGLISH]: 'School ID is required for super admin',
      [LanguageEnum.FRENCH]: "L'identifiant de l'école est requis pour le super administrateur",
    },
    UNAUTHORIZED_ENROLLMENT: {
      [LanguageEnum.ENGLISH]: 'You are not authorized to manage enrollments',
      [LanguageEnum.FRENCH]: 'Vous n\'êtes pas autorisé à gérer les inscriptions',
    },
    ENROLLMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to enroll student',
      [LanguageEnum.FRENCH]: 'Échec de l\'inscription de l\'étudiant',
    },
    WITHDRAWAL_FAILED: {
      [LanguageEnum.ENGLISH]: 'Failed to withdraw enrollment',
      [LanguageEnum.FRENCH]: 'Échec du retrait de l\'inscription',
    },
    BULK_ENROLLMENT_FAILED: {
      [LanguageEnum.ENGLISH]: 'Bulk enrollment operation failed',
      [LanguageEnum.FRENCH]: 'L\'opération d\'inscription en masse a échoué',
    },
    INVALID_ACADEMIC_YEAR: {
      [LanguageEnum.ENGLISH]: 'Invalid academic year. Must be between 1 and 5',
      [LanguageEnum.FRENCH]: 'Année académique invalide. Doit être comprise entre 1 et 5',
    },
  },
};

// Success Messages
export const SUCCESS_MESSAGES: {
  [key: string]: { [key: string]: ErrorMessages };
} = {
  // Module Related Success Messages
  MODULE: {
    MODULES_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Modules retrieved successfully',
      [LanguageEnum.FRENCH]: 'Modules récupérés avec succès',
    },
    CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module created successfully',
      [LanguageEnum.FRENCH]: 'Module créé avec succès',
    },
    UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module updated successfully',
      [LanguageEnum.FRENCH]: 'Module mis à jour avec succès',
    },
    DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module deleted successfully',
      [LanguageEnum.FRENCH]: 'Module supprimé avec succès',
    },
    PUBLISHED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module published successfully',
      [LanguageEnum.FRENCH]: 'Module publié avec succès',
    },
    UNPUBLISHED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module unpublished successfully',
      [LanguageEnum.FRENCH]: 'Module dépublié avec succès',
    },
    NO_ASSIGNED_MODULES: {
      [LanguageEnum.ENGLISH]: 'No assigned modules found',
      [LanguageEnum.FRENCH]: 'Aucun module assigné trouvé',
    },
    MODULE_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module retrieved successfully',
      [LanguageEnum.FRENCH]: 'Module récupéré avec succès',
    },
    MODULE_OVERVIEW_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module overview retrieved successfully',
      [LanguageEnum.FRENCH]: 'Aperçu du module récupéré avec succès',
    },
    ASSIGNMENT_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Assignment updated successfully',
      [LanguageEnum.FRENCH]: 'Affectation mise à jour avec succès',
    },
    PROFESSOR_ASSIGNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor assigned successfully',
      [LanguageEnum.FRENCH]: 'Professeur assigné avec succès',
    },
    PROFESSOR_ASSIGNMENT_REACTIVATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor assignment reactivated successfully',
      [LanguageEnum.FRENCH]: 'Affectation du professeur réactivée avec succès',
    },
    PROFESSOR_UNASSIGNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor unassigned successfully',
      [LanguageEnum.FRENCH]: 'Professeur désassigné avec succès',
    },
    MODULE_ASSIGNMENTS_MANAGED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module assignments managed successfully',
      [LanguageEnum.FRENCH]: 'Affectations de modules gérées avec succès',
    },
    MODULE_ASSIGNMENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module assignments retrieved successfully',
      [LanguageEnum.FRENCH]: 'Affectations de modules récupérées avec succès',
    },
    PROFESSOR_ASSIGNMENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor assignments retrieved successfully',
      [LanguageEnum.FRENCH]:
        'Affectations de professeurs récupérées avec succès',
    },
    ASSIGNMENT_AUDIT_LOGS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Assignment audit logs retrieved successfully',
      [LanguageEnum.FRENCH]:
        "Journaux d'audit des affectations récupérés avec succès",
    },
    PROFESSOR_ASSIGNMENTS_PROCESSED: {
      [LanguageEnum.ENGLISH]: 'Professor assignments processed successfully',
      [LanguageEnum.FRENCH]: 'Affectations de professeurs traitées avec succès',
    },
  },
  // Quiz Related Success Messages
  QUIZ: {
    QUIZ_GROUP_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz group created successfully',
      [LanguageEnum.FRENCH]: 'Groupe de quiz créé avec succès',
    },
    QUIZ_GROUP_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz group updated successfully',
      [LanguageEnum.FRENCH]: 'Groupe de quiz mis à jour avec succès',
    },
    QUIZ_GROUP_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz group deleted successfully',
      [LanguageEnum.FRENCH]: 'Groupe de quiz supprimé avec succès',
    },
    QUIZ_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz created successfully',
      [LanguageEnum.FRENCH]: 'Quiz créé avec succès',
    },
    QUIZ_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz updated successfully',
      [LanguageEnum.FRENCH]: 'Quiz mis à jour avec succès',
    },
    QUIZ_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz deleted successfully',
      [LanguageEnum.FRENCH]: 'Quiz supprimé avec succès',
    },
    STUDENTS_NOTIFIED_ABOUT_NEW_QUIZ: {
      [LanguageEnum.ENGLISH]: 'Students notified about new quiz successfully',
      [LanguageEnum.FRENCH]: 'Étudiants notifiés du nouveau quiz avec succès',
    },
  },
  // Chapter Related Success Messages
  CHAPTER: {
    CHAPTER_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter created successfully',
      [LanguageEnum.FRENCH]: 'Chapitre créé avec succès',
    },
    CHAPTER_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter updated successfully',
      [LanguageEnum.FRENCH]: 'Chapitre mis à jour avec succès',
    },
    CHAPTER_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter deleted successfully',
      [LanguageEnum.FRENCH]: 'Chapitre supprimé avec succès',
    },
    CHAPTER_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter retrieved successfully',
      [LanguageEnum.FRENCH]: 'Chapitre récupéré avec succès',
    },
    CHAPTERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapters retrieved successfully',
      [LanguageEnum.FRENCH]: 'Chapitres récupérés avec succès',
    },
    CHAPTER_REORDERED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapters reordered successfully',
      [LanguageEnum.FRENCH]: 'Chapitres réordonnés avec succès',
    },
  },
  // Bibliography Related Success Messages
  BIBLIOGRAPHY: {
    BIBLIOGRAPHY_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliography created successfully',
      [LanguageEnum.FRENCH]: 'Bibliographie créée avec succès',
    },
    BIBLIOGRAPHY_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliography updated successfully',
      [LanguageEnum.FRENCH]: 'Bibliographie mise à jour avec succès',
    },
    BIBLIOGRAPHY_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliography deleted successfully',
      [LanguageEnum.FRENCH]: 'Bibliographie supprimée avec succès',
    },
    BIBLIOGRAPHY_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliography retrieved successfully',
      [LanguageEnum.FRENCH]: 'Bibliographie récupérée avec succès',
    },
    BIBLIOGRAPHIES_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliographies retrieved successfully',
      [LanguageEnum.FRENCH]: 'Bibliographies récupérées avec succès',
    },
    BIBLIOGRAPHY_REORDERED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Bibliography reordered successfully',
      [LanguageEnum.FRENCH]: 'Bibliographie réordonnée avec succès',
    },
  },
  // Student Related Success Messages
  STUDENT: {
    STUDENT_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student created successfully',
      [LanguageEnum.FRENCH]: 'Étudiant créé avec succès',
    },
    STUDENT_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student updated successfully',
      [LanguageEnum.FRENCH]: 'Étudiant mis à jour avec succès',
    },
    STUDENT_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student deleted successfully',
      [LanguageEnum.FRENCH]: 'Étudiant supprimé avec succès',
    },
    STUDENT_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student retrieved successfully',
      [LanguageEnum.FRENCH]: 'Étudiant récupéré avec succès',
    },
    STUDENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Students retrieved successfully',
      [LanguageEnum.FRENCH]: 'Étudiants récupérés avec succès',
    },
    STUDENT_PASSWORD_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student password updated successfully',
      [LanguageEnum.FRENCH]:
        "Mot de passe de l'étudiant mis à jour avec succès",
    },
    STUDENTS_IMPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Students imported successfully',
      [LanguageEnum.FRENCH]: 'Étudiants importés avec succès',
    },
  },
  // Professor Related Success Messages
  PROFESSOR: {
    PROFESSOR_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor created successfully',
      [LanguageEnum.FRENCH]: 'Professeur créé avec succès',
    },
    PROFESSOR_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor updated successfully',
      [LanguageEnum.FRENCH]: 'Professeur mis à jour avec succès',
    },
    PROFESSOR_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor deleted successfully',
      [LanguageEnum.FRENCH]: 'Professeur supprimé avec succès',
    },
    PROFESSOR_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor retrieved successfully',
      [LanguageEnum.FRENCH]: 'Professeur récupéré avec succès',
    },
    PROFESSORS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professors retrieved successfully',
      [LanguageEnum.FRENCH]: 'Professeurs récupérés avec succès',
    },
    PROFESSOR_PASSWORD_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Professor password updated successfully',
      [LanguageEnum.FRENCH]:
        'Mot de passe du professeur mis à jour avec succès',
    },
  },
  // School Related Success Messages
  SCHOOL: {
    SCHOOL_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School created successfully',
      [LanguageEnum.FRENCH]: 'École créée avec succès',
    },
    SCHOOL_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School updated successfully',
      [LanguageEnum.FRENCH]: 'École mise à jour avec succès',
    },
    SCHOOL_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School deleted successfully',
      [LanguageEnum.FRENCH]: 'École supprimée avec succès',
    },
    SCHOOL_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School retrieved successfully',
      [LanguageEnum.FRENCH]: 'École récupérée avec succès',
    },
    SCHOOLS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Schools retrieved successfully',
      [LanguageEnum.FRENCH]: 'Écoles récupérées avec succès',
    },
    SCHOOL_DASHBOARD_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School dashboard retrieved successfully',
      [LanguageEnum.FRENCH]: "Tableau de bord de l'école récupéré avec succès",
    },
  },
  // Auth Related Success Messages
  AUTH: {
    LOGIN_SUCCESSFUL: {
      [LanguageEnum.ENGLISH]: 'Login successful',
      [LanguageEnum.FRENCH]: 'Connexion réussie',
    },
    LOGOUT_SUCCESSFUL: {
      [LanguageEnum.ENGLISH]: 'Logout successful',
      [LanguageEnum.FRENCH]: 'Déconnexion réussie',
    },
    PASSWORD_RESET_EMAIL_SENT: {
      [LanguageEnum.ENGLISH]: 'Password reset email sent successfully',
      [LanguageEnum.FRENCH]:
        'Email de réinitialisation du mot de passe envoyé avec succès',
    },
    PASSWORD_RESET_SUCCESSFUL: {
      [LanguageEnum.ENGLISH]: 'Password reset successful',
      [LanguageEnum.FRENCH]: 'Réinitialisation du mot de passe réussie',
    },
    PASSWORD_CHANGED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Password changed successfully',
      [LanguageEnum.FRENCH]: 'Mot de passe changé avec succès',
    },
    REFRESH_TOKEN_SUCCESSFUL: {
      [LanguageEnum.ENGLISH]: 'Token refreshed successfully',
      [LanguageEnum.FRENCH]: 'Jeton actualisé avec succès',
    },
  },
  // Community Related Success Messages
  COMMUNITY: {
    DISCUSSION_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion created successfully',
      [LanguageEnum.FRENCH]: 'Discussion créée avec succès',
    },
    DISCUSSION_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion updated successfully',
      [LanguageEnum.FRENCH]: 'Discussion mise à jour avec succès',
    },
    DISCUSSION_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion deleted successfully',
      [LanguageEnum.FRENCH]: 'Discussion supprimée avec succès',
    },
    DISCUSSION_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion retrieved successfully',
      [LanguageEnum.FRENCH]: 'Discussion récupérée avec succès',
    },
    DISCUSSIONS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussions retrieved successfully',
      [LanguageEnum.FRENCH]: 'Discussions récupérées avec succès',
    },
    REPLY_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reply created successfully',
      [LanguageEnum.FRENCH]: 'Réponse créée avec succès',
    },
    REPLY_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reply updated successfully',
      [LanguageEnum.FRENCH]: 'Réponse mise à jour avec succès',
    },
    REPLY_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reply deleted successfully',
      [LanguageEnum.FRENCH]: 'Réponse supprimée avec succès',
    },
    REPLIES_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Replies retrieved successfully',
      [LanguageEnum.FRENCH]: 'Réponses récupérées avec succès',
    },
    SUB_REPLIES_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Sub-replies retrieved successfully',
      [LanguageEnum.FRENCH]: 'Sous-réponses récupérées avec succès',
    },
    REPLY_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reply retrieved successfully',
      [LanguageEnum.FRENCH]: 'Réponse récupérée avec succès',
    },
    LIKE_TOGGLED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Like toggled successfully',
      [LanguageEnum.FRENCH]: 'Like basculé avec succès',
    },
    PIN_TOGGLED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Pin toggled successfully',
      [LanguageEnum.FRENCH]: 'Épinglage basculé avec succès',
    },
    CONTENT_REPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Content reported successfully',
      [LanguageEnum.FRENCH]: 'Contenu signalé avec succès',
    },
    DISCUSSIONS_EXPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussions exported successfully',
      [LanguageEnum.FRENCH]: 'Discussions exportées avec succès',
    },
    LIKED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Content liked successfully',
      [LanguageEnum.FRENCH]: 'Contenu aimé avec succès',
    },
    UNLIKED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Content unliked successfully',
      [LanguageEnum.FRENCH]: 'Contenu retiré des likes avec succès',
    },
    PINNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion pinned successfully',
      [LanguageEnum.FRENCH]: 'Discussion épinglée avec succès',
    },
    UNPINNED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion unpinned successfully',
      [LanguageEnum.FRENCH]: 'Discussion désépinglée avec succès',
    },
    DISCUSSION_ARCHIVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Discussion archived successfully',
      [LanguageEnum.FRENCH]: 'Discussion archivée avec succès',
    },
    UNREAD_COUNTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Unread counts retrieved successfully',
      [LanguageEnum.FRENCH]: 'Compteurs de non lus récupérés avec succès',
    },
    PIN_STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Pin status retrieved successfully',
      [LanguageEnum.FRENCH]: "Statut d'épinglage récupéré avec succès",
    },
    LIKE_STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Like status retrieved successfully',
      [LanguageEnum.FRENCH]: 'Statut de like récupéré avec succès',
    },
    LIKED_BY_USERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Liked by users retrieved successfully',
      [LanguageEnum.FRENCH]: 'Utilisateurs ayant aimé récupérés avec succès',
    },
    SCHOOL_MEMBERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'School members retrieved successfully',
      [LanguageEnum.FRENCH]: "Membres de l'école récupérés avec succès",
    },
    FORUM_ATTACHMENT_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachment created successfully',
      [LanguageEnum.FRENCH]: 'Pièce jointe du forum créée avec succès',
    },
    FORUM_ATTACHMENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachments retrieved successfully',
      [LanguageEnum.FRENCH]: 'Pièces jointes du forum récupérées avec succès',
    },
    FORUM_ATTACHMENT_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Forum attachment deleted successfully',
      [LanguageEnum.FRENCH]: 'Pièce jointe du forum supprimée avec succès',
    },
    REPORTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Reports retrieved successfully',
      [LanguageEnum.FRENCH]: 'Signalements récupérés avec succès',
    },
    TAGS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Tags retrieved successfully',
      [LanguageEnum.FRENCH]: 'Tags récupérés avec succès',
    },
    ERROR_GETTING_TAGS: {
      [LanguageEnum.ENGLISH]: 'Failed to retrieve tags',
      [LanguageEnum.FRENCH]: 'Échec de la récupération des tags',
    },
  },
  // Learning Logs Related Success Messages
  LEARNING_LOGS: {
    LEARNING_LOG_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning log created successfully',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage créé avec succès",
    },
    LEARNING_LOG_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning log updated successfully',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage mis à jour avec succès",
    },
    LEARNING_LOG_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning log deleted successfully',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage supprimé avec succès",
    },
    LEARNING_LOG_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning log retrieved successfully',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage récupéré avec succès",
    },
    LEARNING_LOGS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning logs retrieved successfully',
      [LanguageEnum.FRENCH]: "Journaux d'apprentissage récupérés avec succès",
    },
    LEARNING_LOG_REVIEWED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning log reviewed successfully',
      [LanguageEnum.FRENCH]: "Journal d'apprentissage révisé avec succès",
    },
    LEARNING_LOGS_EXPORTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Learning logs exported successfully',
      [LanguageEnum.FRENCH]: "Journaux d'apprentissage exportés avec succès",
    },
  },
  // Notifications Related Success Messages
  NOTIFICATIONS: {
    NOTIFICATION_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notification created successfully',
      [LanguageEnum.FRENCH]: 'Notification créée avec succès',
    },
    NOTIFICATION_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notification retrieved successfully',
      [LanguageEnum.FRENCH]: 'Notification récupérée avec succès',
    },
    NOTIFICATIONS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notifications retrieved successfully',
      [LanguageEnum.FRENCH]: 'Notifications récupérées avec succès',
    },
    NOTIFICATION_MARKED_READ_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notification marked as read successfully',
      [LanguageEnum.FRENCH]: 'Notification marquée comme lue avec succès',
    },
    NOTIFICATIONS_MARKED_READ_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notifications marked as read successfully',
      [LanguageEnum.FRENCH]: 'Notifications marquées comme lues avec succès',
    },
    NOTIFICATIONS_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Notifications created successfully',
      [LanguageEnum.FRENCH]: 'Notifications créées avec succès',
    },
    UNREAD_COUNT_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Unread count retrieved successfully',
      [LanguageEnum.FRENCH]: 'Nombre de non lus récupéré avec succès',
    },
  },
  // User Related Success Messages
  USER: {
    USER_CREATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'User created successfully',
      [LanguageEnum.FRENCH]: 'Utilisateur créé avec succès',
    },
    USER_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'User updated successfully',
      [LanguageEnum.FRENCH]: 'Utilisateur mis à jour avec succès',
    },
    USER_DELETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'User deleted successfully',
      [LanguageEnum.FRENCH]: 'Utilisateur supprimé avec succès',
    },
    USER_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'User retrieved successfully',
      [LanguageEnum.FRENCH]: 'Utilisateur récupéré avec succès',
    },
    USERS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Users retrieved successfully',
      [LanguageEnum.FRENCH]: 'Utilisateurs récupérés avec succès',
    },
    USER_PASSWORD_UPDATED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'User password updated successfully',
      [LanguageEnum.FRENCH]:
        "Mot de passe de l'utilisateur mis à jour avec succès",
    },
  },
  // Progress Related Success Messages
  PROGRESS: {
    MODULE_STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module started successfully',
      [LanguageEnum.FRENCH]: 'Module commencé avec succès',
    },
    CHAPTER_STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter started successfully',
      [LanguageEnum.FRENCH]: 'Chapitre commencé avec succès',
    },
    CHAPTER_MARKED_AS_COMPLETE_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter marked as complete successfully',
      [LanguageEnum.FRENCH]: 'Chapitre marqué comme terminé avec succès',
    },
    QUIZ_ATTEMPT_STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz attempt started successfully',
      [LanguageEnum.FRENCH]: 'Tentative de quiz commencée avec succès',
    },
    QUIZ_ANSWERS_SUBMITTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz answers submitted successfully',
      [LanguageEnum.FRENCH]: 'Réponses au quiz soumises avec succès',
    },
    CHAPTER_PROGRESS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Chapter progress retrieved successfully',
      [LanguageEnum.FRENCH]: 'Progrès du chapitre récupéré avec succès',
    },
    QUIZ_ATTEMPTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Quiz attempts retrieved successfully',
      [LanguageEnum.FRENCH]: 'Tentatives de quiz récupérées avec succès',
    },
    MODULE_PROGRESS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Module progress retrieved successfully',
      [LanguageEnum.FRENCH]: 'Progrès du module récupéré avec succès',
    },
    DASHBOARD_DATA_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Dashboard data retrieved successfully',
      [LanguageEnum.FRENCH]:
        'Données du tableau de bord récupérées avec succès',
    },
    ADMIN_DASHBOARD_DATA_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Admin dashboard data retrieved successfully',
      [LanguageEnum.FRENCH]:
        'Données du tableau de bord administrateur récupérées avec succès',
    },
  },
  // AI Chat Related Success Messages
  AI_CHAT: {
    AI_SESSION_COMPLETED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'AI session completed successfully',
      [LanguageEnum.FRENCH]: 'Session IA terminée avec succès',
    },
  },

  // Simulation Related Success Messages
  SIMULATION: {
    STARTED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student view simulation started successfully',
      [LanguageEnum.FRENCH]: 'Simulation de vue étudiant démarrée avec succès',
    },
    ENDED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student view simulation ended successfully',
      [LanguageEnum.FRENCH]: 'Simulation de vue étudiant terminée avec succès',
    },
    STUDENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Students available for simulation retrieved successfully',
      [LanguageEnum.FRENCH]: 'Étudiants disponibles pour la simulation récupérés avec succès',
    },
    HISTORY_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Simulation history retrieved successfully',
      [LanguageEnum.FRENCH]: 'Historique de simulation récupéré avec succès',
    },
    STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Simulation status retrieved successfully',
      [LanguageEnum.FRENCH]: 'Statut de simulation récupéré avec succès',
    },
  },

  // Enrollment Related Success Messages
  ENROLLMENT: {
    ENROLLED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student enrolled successfully',
      [LanguageEnum.FRENCH]: 'Étudiant inscrit avec succès',
    },
    BULK_ENROLLED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Students enrolled successfully',
      [LanguageEnum.FRENCH]: 'Étudiants inscrits avec succès',
    },
    ACADEMIC_YEAR_ENROLLED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Student enrolled in academic year successfully',
      [LanguageEnum.FRENCH]: 'Étudiant inscrit à l\'année académique avec succès',
    },
    WITHDRAWN_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Enrollment withdrawn successfully',
      [LanguageEnum.FRENCH]: 'Inscription retirée avec succès',
    },
    ENROLLMENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Enrollments retrieved successfully',
      [LanguageEnum.FRENCH]: 'Inscriptions récupérées avec succès',
    },
    ENROLLMENT_STATUS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Enrollment status retrieved successfully',
      [LanguageEnum.FRENCH]: 'Statut d\'inscription récupéré avec succès',
    },
    ENROLLMENT_HISTORY_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Enrollment history retrieved successfully',
      [LanguageEnum.FRENCH]: 'Historique des inscriptions récupéré avec succès',
    },
    AVAILABLE_STUDENTS_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Available students retrieved successfully',
      [LanguageEnum.FRENCH]: 'Étudiants disponibles récupérés avec succès',
    },
    AVAILABLE_MODULES_RETRIEVED_SUCCESSFULLY: {
      [LanguageEnum.ENGLISH]: 'Available modules retrieved successfully',
      [LanguageEnum.FRENCH]: 'Modules disponibles récupérés avec succès',
    },
  },
};

// Helper function to get error message
export function getErrorMessage(
  category: string,
  key: string,
  language: LanguageEnum = LanguageEnum.FRENCH,
): string {
  const categoryMessages = ERROR_MESSAGES[category];
  if (!categoryMessages) {
    return ERROR_MESSAGES.GENERAL.NOT_FOUND[language];
  }

  const message = categoryMessages[key];
  if (!message) {
    return ERROR_MESSAGES.GENERAL.NOT_FOUND[language];
  }

  return message[language];
}

// Helper function to get error message with parameters
export function getErrorMessageWithParams(
  category: string,
  key: string,
  params: Record<string, string>,
  language: LanguageEnum = LanguageEnum.FRENCH,
): string {
  let message = getErrorMessage(category, key, language);

  // Replace parameters in the message
  Object.keys(params).forEach((param) => {
    message = message.replace(`{${param}}`, params[param]);
  });

  return message;
}

// Helper function to get success message
export function getSuccessMessage(
  category: string,
  key: string,
  language: LanguageEnum = LanguageEnum.FRENCH,
): string {
  const categoryMessages = SUCCESS_MESSAGES[category];
  if (!categoryMessages) {
    return 'Operation completed successfully';
  }

  const message = categoryMessages[key];
  if (!message) {
    return 'Operation completed successfully';
  }

  return message[language];
}

// Helper function to get success message with parameters
export function getSuccessMessageWithParams(
  category: string,
  key: string,
  params: Record<string, string>,
  language: LanguageEnum = LanguageEnum.FRENCH,
): string {
  let message = getSuccessMessage(category, key, language);

  // Replace parameters in the message
  Object.keys(params).forEach((param) => {
    message = message.replace(`{${param}}`, params[param]);
  });

  return message;
}
