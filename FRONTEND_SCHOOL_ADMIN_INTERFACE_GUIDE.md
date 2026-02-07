# School Admin Interface - Comprehensive Assessment Integration Guide

**Date**: February 7, 2026  
**Backend Version**: Phase 4 Complete  
**Status**: Ready for Frontend Integration  
**Priority**: HIGH

---

## 🎯 What Changed & Why

### The Big Picture

We've upgraded the internship system with a **comprehensive pedagogical assessment framework** that allows professors/admins to:

1. ✅ Create structured cases with detailed assessment criteria (must total 100 points)
2. ✅ Configure pass thresholds per case
3. ✅ Track student attempts (unlimited retries)
4. ✅ View patient progression across cases (Steps 2-3)
5. ✅ Manually override AI assessments
6. ✅ Monitor student evolution and performance
7. ✅ Export comprehensive reports

---

## 📋 School Admin Interface Updates Required

### Priority 1: Case Creation & Management (CRITICAL)

### Priority 2: Assessment Validation & Override

### Priority 3: Student Progress Monitoring

### Priority 4: Patient Progression View (Steps 2-3)

---

## 🔥 PRIORITY 1: Case Creation & Management

### Part A: Create Case Form (Enhanced)

### API Call

```typescript
const createCase = async (internshipId: string, caseData: CaseFormData) => {
  const response = await fetch(`/api/internship/${internshipId}/cases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer {token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(caseData)
  });
  
  return await response.json();
};
```

### Request Format (Complete Example)

```json
{
  "title": "Mathilde Perez - Anamnèse et Stabilisation",
  "description": "Pratique EMDR Phase 1-2: Anamnèse complète, évaluation de la stabilité, hiérarchisation des cibles",
  "sequence": 1,
  
  // ========== NEW: 3-Step Structure ==========
  "step": 1,
  "case_type": "isolated",
  "patient_base_id": null,
  "sequence_in_step": 1,
  "emdr_phase_focus": null,
  "session_narrative": null,
  
  // ========== NEW: Rich Assessment Criteria (MUST TOTAL 100) ==========
  "assessment_criteria": [
    {
      "criterion_id": "anamnesis",
      "name": "Anamnèse",
      "description": "Collecte complète des traumatismes et symptômes. Exploration approfondie de l'histoire de la patiente, identification des violences subies, des triggers actuels.",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.145-148",
      "ko_example": "Ignorer l'histoire de harcèlement scolaire, manquer les idéations suicidaires, ne pas documenter les symptômes somatiques (gorge serrée).",
      "ok_example": "Documenter toutes les violences (prof de flûte 8-12 ans, harcèlement scolaire 12-17 ans), identifier les symptômes clés (gorge serrée, tremblements, flashbacks), explorer la décompensation à 17 ans."
    },
    {
      "criterion_id": "stability",
      "name": "Évaluation de la Stabilité",
      "description": "Évaluation des risques (suicidalité) et des ressources (famille, amis, stratégies de coping). Identification du réseau de soutien.",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.148-150",
      "ko_example": "Ne pas poser de question sur les idées suicidaires, ignorer le réseau de soutien, ne pas évaluer les ressources actuelles.",
      "ok_example": "Poser la question directe sur la suicidalité ('Avez-vous décidé de mourir?'), identifier les ressources familiales (mère prof, père notaire, grande sœur), valider les stratégies de coping actuelles."
    },
    {
      "criterion_id": "target_hierarchy",
      "name": "Hiérarchie des Cibles",
      "description": "Identification et priorisation logique des cibles traumatiques. La cible principale doit être celle avec le SUD le plus élevé.",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.150-155",
      "ko_example": "Commencer par le harcèlement scolaire au lieu de la scène du miroir (SUD=8), ordre illogique des cibles.",
      "ok_example": "Identifier la scène du miroir comme cible principale (SUD=8), établir une hiérarchie logique: miroir → violences physiques → harcèlement, justifier l'ordre par les niveaux de détresse."
    },
    {
      "criterion_id": "empathy",
      "name": "Posture Empathique",
      "description": "Validation des émotions, reformulation, écoute active. Maintien d'une posture Rogers tout au long de la séance.",
      "max_points": 25,
      "reference_literature": "Carl Rogers - Écoute Active",
      "ko_example": "Dire 'Ce n'est pas si grave', interrompre la patiente pendant les récits, minimiser la souffrance.",
      "ok_example": "Valider systématiquement ('C'est normal de ressentir cela'), reformuler pour montrer la compréhension, ne pas interrompre, accueillir les émotions sans jugement."
    }
  ],
  
  // ========== NEW: Literature References ==========
  "literature_references": [
    {
      "title": "Shapiro EMDR Manual",
      "type": "book",
      "relevant_pages": "p.145-155 (Phase 1-2)",
      "pinecone_namespace": "baby-ai",
      "priority": "primary"
    },
    {
      "title": "Carl Rogers - On Becoming a Person",
      "type": "book",
      "relevant_pages": "Chapitre 3: Écoute Active",
      "pinecone_namespace": "baby-ai",
      "priority": "secondary"
    }
  ],
  
  // ========== NEW: Configurable Pass Threshold ==========
  "pass_threshold": 70,
  
  // ========== NEW: Patient State (for Steps 2-3 only) ==========
  "patient_state": null,
  
  // ========== Existing Fields ==========
  "patient_simulation_config": {
    "patient_profile": {
      "name": "Mathilde Perez",
      "age": 18,
      "gender": "female",
      "condition": "PTSD",
      "trauma_summary": "Violences prof de flûte 8-12 ans, harcèlement scolaire 12-17 ans",
      "key_symptoms": ["Gorge serrée", "Tremblements", "Flashbacks miroir", "Auto-blâme"],
      "current_sud_voc": {
        "mirror_scene": {
          "SUD": 8,
          "VOC": 1
        }
      }
    },
    "scenario_type": "emdr_therapy",
    "difficulty_level": "intermediate"
  },
  
  "session_config": {
    "session_duration_minutes": 90,
    "max_sessions_allowed": null,
    "allow_pause": true,
    "auto_end_on_timeout": false,
    "warning_before_timeout_minutes": 5
  }
}
```

### UI Components for Case Creation

#### 1. Step Selector (NEW)

```tsx
// Component: StepSelector.tsx
<StepSelector value={step} onChange={setStep}>
  <StepOption value={1}>
    <StepBadge color="purple">Étape 1</StepBadge>
    <StepTitle>Cas Isolés</StepTitle>
    <StepDescription>
      5 patients différents, 1 séance par patient, aucune contamination croisée
    </StepDescription>
  </StepOption>
  
  <StepOption value={2}>
    <StepBadge color="blue">Étape 2</StepBadge>
    <StepTitle>Protocole Progressif</StepTitle>
    <StepDescription>
      7 cas, MÊME patient, évolution à travers les phases EMDR
    </StepDescription>
  </StepOption>
  
  <StepOption value={3}>
    <StepBadge color="green">Étape 3</StepBadge>
    <StepTitle>Parcours Réaliste</StepTitle>
    <StepDescription>
      15 cas, MÊME patient, évolution non-linéaire avec rechutes et percées
    </StepDescription>
  </StepOption>
</StepSelector>
```

#### 2. Case Type Selector (NEW)

```tsx
// Component: CaseTypeSelector.tsx
// Auto-filled based on step, but can be customized
<CaseTypeSelector value={caseType} onChange={setCaseType}>
  <TypeOption value="isolated" disabled={step !== 1}>
    <Icon>📌</Icon>
    <Label>Cas Isolé</Label>
  </TypeOption>
  
  <TypeOption value="progressive" disabled={step !== 2}>
    <Icon>📈</Icon>
    <Label>Évolution Progressive</Label>
  </TypeOption>
  
  <TypeOption value="realistic" disabled={step !== 3}>
    <Icon>🌊</Icon>
    <Label>Parcours Réaliste</Label>
  </TypeOption>
</CaseTypeSelector>
```

#### 3. Patient Base ID Input (NEW - Steps 2-3 only)

```tsx
// Component: PatientBaseIdInput.tsx
{step >= 2 && (
  <PatientBaseIdSection>
    <SectionTitle>
      👤 Identifiant Patient (Continuité Steps 2-3)
      <Tooltip>
        Utilisez le même patient_base_id pour tous les cas du même patient.
        Ex: "brigitte_fenurel" pour tous les cas de Brigitte.
      </Tooltip>
    </SectionTitle>
    
    <InputField
      label="Patient Base ID"
      placeholder="Ex: brigitte_fenurel, mathilde_perez"
      value={patientBaseId}
      onChange={setPatientBaseId}
      required
      pattern="^[a-z_]+$"
      helpText="Lettres minuscules et underscores uniquement"
    />
    
    <SequenceInput
      label="Séquence dans l'étape"
      type="number"
      min={1}
      max={step === 2 ? 7 : 15}
      value={sequenceInStep}
      onChange={setSequenceInStep}
      helpText={`Position dans l'Étape ${step} (1-${step === 2 ? 7 : 15})`}
    />
    
    {step === 2 && (
      <EMDRPhaseInput
        label="Focus Phase EMDR"
        placeholder="Ex: Phase 1-2, Phase 3-4, Phase 5-6"
        value={emdrPhaseFocus}
        onChange={setEmdrPhaseFocus}
        helpText="Quelle phase EMDR ce cas pratique"
      />
    )}
    
    {step === 3 && (
      <SessionNarrativeInput
        label="Narratif de Séance"
        placeholder="Ex: Rechute après stress au travail, Percée majeure sur cible principale"
        value={sessionNarrative}
        onChange={setSessionNarrative}
        helpText="Description de l'évolution dans ce cas"
        multiline
        rows={3}
      />
    )}
  </PatientBaseIdSection>
)}
```

#### 4. Assessment Criteria Editor (NEW - CRITICAL)

```tsx
// Component: AssessmentCriteriaEditor.tsx
<CriteriaEditorSection>
  <SectionHeader>
    <SectionTitle>
      📊 Critères d'Évaluation
      <RequiredBadge>DOIT TOTALISER 100 POINTS</RequiredBadge>
    </SectionTitle>
    <TotalDisplay 
      total={getTotalPoints()} 
      isValid={getTotalPoints() === 100}
    >
      Total: {getTotalPoints()}/100
    </TotalDisplay>
  </SectionHeader>
  
  {assessmentCriteria.map((criterion, index) => (
    <CriterionCard key={index}>
      <CardHeader>
        <CriterionNumber>Critère {index + 1}</CriterionNumber>
        <DeleteButton onClick={() => removeCriterion(index)}>
          🗑️ Supprimer
        </DeleteButton>
      </CardHeader>
      
      <FormGrid>
        <InputField
          label="ID du Critère"
          placeholder="Ex: anamnesis, stability, empathy"
          value={criterion.criterion_id}
          onChange={(val) => updateCriterion(index, 'criterion_id', val)}
          required
          pattern="^[a-z_]+$"
          helpText="Identifiant unique (minuscules et underscores)"
        />
        
        <InputField
          label="Nom du Critère"
          placeholder="Ex: Anamnèse, Stabilité, Empathie"
          value={criterion.name}
          onChange={(val) => updateCriterion(index, 'name', val)}
          required
        />
        
        <PointsInput
          label="Points Maximum"
          type="number"
          min={1}
          max={100}
          value={criterion.max_points}
          onChange={(val) => updateCriterion(index, 'max_points', val)}
          required
          helpText={`Restant: ${100 - getTotalPoints() + criterion.max_points} pts`}
        />
        
        <TextArea
          label="Description (ce qui est évalué)"
          placeholder="Ex: Collecte complète des traumatismes et symptômes..."
          value={criterion.description}
          onChange={(val) => updateCriterion(index, 'description', val)}
          required
          rows={3}
        />
        
        <InputField
          label="Référence Littérature (optionnel)"
          placeholder="Ex: Shapiro EMDR Manual p.145-148"
          value={criterion.reference_literature}
          onChange={(val) => updateCriterion(index, 'reference_literature', val)}
        />
        
        <TextArea
          label="Exemple KO (mauvaise pratique)"
          placeholder="Ex: Ignorer l'histoire de harcèlement, ne pas documenter les symptômes..."
          value={criterion.ko_example}
          onChange={(val) => updateCriterion(index, 'ko_example', val)}
          rows={2}
          helpText="Exemple de ce qu'il NE FAUT PAS faire"
        />
        
        <TextArea
          label="Exemple OK (bonne pratique)"
          placeholder="Ex: Documenter toutes les violences, identifier les symptômes clés..."
          value={criterion.ok_example}
          onChange={(val) => updateCriterion(index, 'ok_example', val)}
          rows={2}
          helpText="Exemple de ce qu'il FAUT faire"
        />
      </FormGrid>
    </CriterionCard>
  ))}
  
  <AddCriterionButton onClick={addCriterion}>
    ➕ Ajouter un Critère
  </AddCriterionButton>
  
  {getTotalPoints() !== 100 && (
    <ValidationError>
      ⚠️ Le total des points doit être exactement 100. Actuellement: {getTotalPoints()}
    </ValidationError>
  )}
</CriteriaEditorSection>
```

**Validation Logic**:

```typescript
const getTotalPoints = () => {
  return assessmentCriteria.reduce((sum, c) => sum + (c.max_points || 0), 0);
};

const validateCriteria = () => {
  const total = getTotalPoints();
  if (total !== 100) {
    return { valid: false, error: `Total must be 100 points (currently ${total})` };
  }
  
  const hasEmptyIds = assessmentCriteria.some(c => !c.criterion_id);
  if (hasEmptyIds) {
    return { valid: false, error: 'All criteria must have an ID' };
  }
  
  const hasEmptyNames = assessmentCriteria.some(c => !c.name);
  if (hasEmptyNames) {
    return { valid: false, error: 'All criteria must have a name' };
  }
  
  return { valid: true };
};
```

#### 5. Literature References Editor (NEW)

```tsx
// Component: LiteratureReferencesEditor.tsx
<LiteratureSection>
  <SectionTitle>
    📚 Références Littéraires (pour l'IA)
    <Tooltip>
      L'IA utilisera ces références pour évaluer l'adhésion au protocole
    </Tooltip>
  </SectionTitle>
  
  {literatureReferences.map((ref, index) => (
    <ReferenceCard key={index}>
      <CardHeader>
        <RefNumber>Référence {index + 1}</RefNumber>
        <DeleteButton onClick={() => removeReference(index)}>
          🗑️
        </DeleteButton>
      </CardHeader>
      
      <FormGrid>
        <InputField
          label="Titre"
          placeholder="Ex: Shapiro EMDR Manual"
          value={ref.title}
          onChange={(val) => updateReference(index, 'title', val)}
          required
        />
        
        <SelectField
          label="Type"
          value={ref.type}
          onChange={(val) => updateReference(index, 'type', val)}
          required
        >
          <option value="book">Livre</option>
          <option value="article">Article</option>
          <option value="manual">Manuel</option>
        </SelectField>
        
        <InputField
          label="Pages Pertinentes (optionnel)"
          placeholder="Ex: p.145-155, Chapitre 3"
          value={ref.relevant_pages}
          onChange={(val) => updateReference(index, 'relevant_pages', val)}
        />
        
        <InputField
          label="Namespace Pinecone"
          placeholder="baby-ai (défaut)"
          value={ref.pinecone_namespace}
          onChange={(val) => updateReference(index, 'pinecone_namespace', val)}
          helpText="Laisser 'baby-ai' pour la base principale"
        />
        
        <SelectField
          label="Priorité"
          value={ref.priority}
          onChange={(val) => updateReference(index, 'priority', val)}
          required
        >
          <option value="primary">Primaire (essentiel)</option>
          <option value="secondary">Secondaire (complémentaire)</option>
        </SelectField>
      </FormGrid>
    </ReferenceCard>
  ))}
  
  <AddReferenceButton onClick={addReference}>
    ➕ Ajouter une Référence
  </AddReferenceButton>
</LiteratureSection>
```

#### 6. Pass Threshold Slider (NEW)

```tsx
// Component: PassThresholdSlider.tsx
<PassThresholdSection>
  <SectionTitle>
    ✅ Seuil de Réussite Configurable
  </SectionTitle>
  
  <SliderContainer>
    <Slider
      min={0}
      max={100}
      step={5}
      value={passThreshold}
      onChange={setPassThreshold}
      marks={[
        { value: 50, label: '50%' },
        { value: 60, label: '60%' },
        { value: 70, label: '70%' },
        { value: 80, label: '80%' },
        { value: 90, label: '90%' }
      ]}
    />
    <ThresholdDisplay>
      Seuil: <strong>{passThreshold}%</strong>
    </ThresholdDisplay>
  </SliderContainer>
  
  <HelpText>
    Les étudiants doivent obtenir au moins {passThreshold}% pour réussir ce cas.
    Défaut recommandé: 70%
  </HelpText>
</PassThresholdSection>
```

#### 7. Patient State Editor (NEW - Steps 2-3 only)

```tsx
// Component: PatientStateEditor.tsx
{step >= 2 && (
  <PatientStateSection>
    <SectionTitle>
      🏥 État Actuel du Patient (pour ce cas)
    </SectionTitle>
    
    <StateGrid>
      <InputField
        label="SUD Actuel (Subjective Units of Distress)"
        type="number"
        min={0}
        max={10}
        value={patientState.current_sud}
        onChange={(val) => updatePatientState('current_sud', val)}
        helpText="0 = Aucune détresse, 10 = Détresse maximale"
      />
      
      <InputField
        label="VOC Actuel (Validity of Cognition)"
        type="number"
        min={1}
        max={7}
        value={patientState.current_voc}
        onChange={(val) => updatePatientState('current_voc', val)}
        helpText="1 = Croyance totalement fausse, 7 = Totalement vraie"
      />
      
      <CheckboxField
        label="Lieu Sûr Établi"
        checked={patientState.safe_place_established}
        onChange={(val) => updatePatientState('safe_place_established', val)}
      />
      
      <TagInput
        label="Cibles Traumatiques Résolues"
        value={patientState.trauma_targets_resolved}
        onChange={(val) => updatePatientState('trauma_targets_resolved', val)}
        placeholder="Appuyez sur Entrée pour ajouter"
      />
      
      <TagInput
        label="Techniques Maîtrisées"
        value={patientState.techniques_mastered}
        onChange={(val) => updatePatientState('techniques_mastered', val)}
        placeholder="Ex: anamnesis, safe_place, bilateral_stimulation"
      />
      
      <SelectField
        label="Trajectoire de Progrès"
        value={patientState.progress_trajectory}
        onChange={(val) => updatePatientState('progress_trajectory', val)}
      >
        <option value="">Non défini</option>
        <option value="improvement">📈 Amélioration</option>
        <option value="stable">➡️ Stable</option>
        <option value="regression">📉 Régression</option>
        <option value="breakthrough">🎉 Percée Majeure</option>
      </SelectField>
    </StateGrid>
  </PatientStateSection>
)}
```

### Form Validation

```typescript
const validateCaseForm = (formData: CaseFormData): ValidationResult => {
  const errors: string[] = [];
  
  // Basic fields
  if (!formData.title) errors.push('Titre requis');
  if (!formData.description) errors.push('Description requise');
  if (!formData.step) errors.push('Étape requise');
  if (!formData.case_type) errors.push('Type de cas requis');
  
  // Assessment criteria validation (CRITICAL)
  if (!formData.assessment_criteria || formData.assessment_criteria.length === 0) {
    errors.push('Au moins un critère d\'évaluation requis');
  } else {
    const total = formData.assessment_criteria.reduce((sum, c) => sum + c.max_points, 0);
    if (total !== 100) {
      errors.push(`Les critères doivent totaliser 100 points (actuellement ${total})`);
    }
    
    formData.assessment_criteria.forEach((c, i) => {
      if (!c.criterion_id) errors.push(`Critère ${i+1}: ID requis`);
      if (!c.name) errors.push(`Critère ${i+1}: Nom requis`);
      if (!c.description) errors.push(`Critère ${i+1}: Description requise`);
      if (c.max_points < 1) errors.push(`Critère ${i+1}: Points minimum 1`);
    });
  }
  
  // Step-specific validation
  if (formData.step >= 2) {
    if (!formData.patient_base_id) {
      errors.push('Patient Base ID requis pour Étapes 2-3');
    }
    if (!formData.sequence_in_step) {
      errors.push('Séquence dans l\'étape requise');
    }
  }
  
  if (formData.step === 2 && !formData.emdr_phase_focus) {
    errors.push('Focus Phase EMDR requis pour Étape 2');
  }
  
  // Pass threshold
  if (formData.pass_threshold < 0 || formData.pass_threshold > 100) {
    errors.push('Seuil de réussite doit être entre 0 et 100');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
```

---

## 🔥 PRIORITY 2: Assessment Validation & Override

### Where: Professor Dashboard / Feedback Validation Page

### Part A: View Pending Assessments

#### API Call

```typescript
const fetchPendingFeedback = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/internship/feedback/pending?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
};
```

#### Response Format

```json
{
  "data": [
    {
      "_id": "65c1234567890abcdef12345",
      "student_id": {
        "_id": "65c1234567890abcdef12346",
        "first_name": "Jean",
        "last_name": "Dupont",
        "email": "jean.dupont@example.com"
      },
      "case_id": {
        "_id": "65c1234567890abcdef12347",
        "title": "Mathilde Perez - Anamnèse",
        "step": 1,
        "case_type": "isolated"
      },
      "session_id": "65c1234567890abcdef12348",
      "ai_feedback": {
        "overall_score": 82,
        "grade": "B",
        "pass_fail": "PASS",
        "criteria_scores": [...],
        "strengths": [...],
        "areas_for_improvement": [...],
        "recommendations_next_session": [...]
      },
      "status": "pending_validation",
      "created_at": "2026-02-07T11:05:32Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### UI Components

```tsx
// Component: PendingFeedbackList.tsx
<PendingFeedbackPage>
  <PageHeader>
    <Title>Évaluations en Attente de Validation</Title>
    <CountBadge>{totalPending} en attente</CountBadge>
  </PageHeader>
  
  <FilterBar>
    <SearchInput 
      placeholder="Rechercher étudiant..." 
      onChange={setSearch}
    />
    <DateRangeFilter onChange={setDateRange} />
    <StepFilter onChange=set{StepFilter} />
  </FilterBar>
  
  <FeedbackTable>
    <TableHeader>
      <Column>Étudiant</Column>
      <Column>Cas</Column>
      <Column>Score</Column>
      <Column>Grade</Column>
      <Column>Pass/Fail</Column>
      <Column>Date</Column>
      <Column>Actions</Column>
    </TableHeader>
    
    {pendingFeedback.map(feedback => (
      <TableRow key={feedback._id}>
        <StudentCell>
          <Avatar src={feedback.student_id.avatar} />
          <StudentName>
            {feedback.student_id.first_name} {feedback.student_id.last_name}
          </StudentName>
        </StudentCell>
        
        <CaseCell>
          <CaseTitle>{feedback.case_id.title}</CaseTitle>
          <StepBadge step={feedback.case_id.step}>
            Étape {feedback.case_id.step}
          </StepBadge>
        </CaseCell>
        
        <ScoreCell>
          <Score>{feedback.ai_feedback.overall_score}/100</Score>
        </ScoreCell>
        
        <GradeCell>
          <GradeBadge grade={feedback.ai_feedback.grade}>
            {feedback.ai_feedback.grade}
          </GradeBadge>
        </GradeCell>
        
        <PassFailCell>
          <PassFailBadge status={feedback.ai_feedback.pass_fail}>
            {feedback.ai_feedback.pass_fail === 'PASS' ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}
          </PassFailBadge>
        </PassFailCell>
        
        <DateCell>
          {formatDate(feedback.created_at)}
        </DateCell>
        
        <ActionsCell>
          <ViewButton onClick={() => handleViewDetails(feedback._id)}>
            👁️ Voir
          </ViewButton>
          <ValidateButton onClick={() => handleValidate(feedback._id)}>
            ✓ Valider
          </ValidateButton>
        </ActionsCell>
      </TableRow>
    ))}
  </FeedbackTable>
  
  <Pagination {...paginationProps} />
</PendingFeedbackPage>
```

### Part B: Manual Assessment Override

#### API Call

```typescript
const updateFeedback = async (feedbackId: string, updates: FeedbackUpdate) => {
  const response = await fetch(`/api/internship/feedback/${feedbackId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  return await response.json();
};
```

#### Request Format

```json
{
  "professor_feedback": {
    "overall_score_override": 85,
    "pass_fail_override": "PASS",
    "professor_comments": "Excellent travail général. L'étudiante montre une très bonne compréhension du protocole EMDR Phase 1. J'ai augmenté le score de 3 points car la validation émotionnelle était particulièrement bien réalisée, même si l'IA ne l'a pas pleinement reconnue. Points à améliorer: l'évaluation des ressources pourrait être plus approfondie.",
    "criteria_adjustments": [
      {
        "criterion_id": "empathy",
        "adjusted_points": 24,
        "original_points": 21,
        "justification": "Validation émotionnelle excellente, mérite 24/25"
      },
      {
        "criterion_id": "stability",
        "adjusted_points": 18,
        "original_points": 18,
        "justification": "Score IA correct"
      }
    ],
    "validated_by": "65c1234567890abcdef12349",
    "validated_at": "2026-02-07T14:30:00Z"
  }
}
```

#### UI Components

```tsx
// Component: AssessmentOverrideModal.tsx
<OverrideModal isOpen={showOverride} onClose={handleClose}>
  <ModalHeader>
    <Title>Validation & Ajustement de l'Évaluation</Title>
    <StudentInfo>
      {student.first_name} {student.last_name} - {caseTitle}
    </StudentInfo>
  </ModalHeader>
  
  <AIAssessmentSummary>
    <SectionTitle>Évaluation IA</SectionTitle>
    <ScoreDisplay>
      <Label>Score IA:</Label>
      <Value>{aiFeedback.overall_score}/100 ({aiFeedback.grade})</Value>
    </ScoreDisplay>
    <PassFailDisplay>
      <Label>Résultat IA:</Label>
      <Badge status={aiFeedback.pass_fail}>{aiFeedback.pass_fail}</Badge>
    </PassFailDisplay>
  </AIAssessmentSummary>
  
  <CriteriaAdjustments>
    <SectionTitle>Ajustement par Critère</SectionTitle>
    {aiFeedback.criteria_scores.map(criterion => (
      <CriterionAdjustment key={criterion.criterion_id}>
        <CriterionHeader>
          <Name>{criterion.criterion_name}</Name>
          <AIScore>IA: {criterion.points_earned}/{criterion.points_max}</AIScore>
        </CriterionHeader>
        
        <AdjustmentInput>
          <Label>Ajuster à:</Label>
          <NumberInput
            min={0}
            max={criterion.points_max}
            value={adjustments[criterion.criterion_id]?.adjusted_points || criterion.points_earned}
            onChange={(val) => updateAdjustment(criterion.criterion_id, val)}
          />
          <MaxLabel>/ {criterion.points_max}</MaxLabel>
        </AdjustmentInput>
        
        {adjustments[criterion.criterion_id]?.adjusted_points !== criterion.points_earned && (
          <JustificationInput>
            <Label>Justification de l'ajustement:</Label>
            <TextArea
              placeholder="Expliquez pourquoi vous modifiez ce score..."
              value={adjustments[criterion.criterion_id]?.justification}
              onChange={(val) => updateJustification(criterion.criterion_id, val)}
              required
              rows={2}
            />
          </JustificationInput>
        )}
      </CriterionAdjustment>
    ))}
  </CriteriaAdjustments>
  
  <OverallOverride>
    <SectionTitle>Score Global (Optionnel)</SectionTitle>
    <OverrideToggle>
      <Checkbox
        checked={overrideOverallScore}
        onChange={setOverrideOverallScore}
        label="Modifier le score global"
      />
    </OverrideToggle>
    
    {overrideOverallScore && (
      <>
        <ScoreInput>
          <Label>Nouveau Score:</Label>
          <NumberInput
            min={0}
            max={100}
            value={overallScoreOverride}
            onChange={setOverallScoreOverride}
          />
          <Label>/ 100</Label>
          <GradeDisplay>
            Grade: {getGradeFromScore(overallScoreOverride)}
          </GradeDisplay>
        </ScoreInput>
        
        <PassFailOverride>
          <Label>Résultat Final:</Label>
          <RadioGroup value={passFailOverride} onChange={setPassFailOverride}>
            <Radio value="PASS" color="green">✅ RÉUSSI</Radio>
            <Radio value="FAIL" color="red">❌ ÉCHOUÉ</Radio>
          </RadioGroup>
        </PassFailOverride>
      </>
    )}
  </OverallOverride>
  
  <ProfessorComments>
    <SectionTitle>Commentaires du Professeur</SectionTitle>
    <TextArea
      placeholder="Ajoutez vos commentaires pour l'étudiant..."
      value={professorComments}
      onChange={setProfessorComments}
      rows={6}
      helpText="Ces commentaires seront visibles par l'étudiant"
    />
  </ProfessorComments>
  
  <ModalActions>
    <CancelButton onClick={handleClose}>
      Annuler
    </CancelButton>
    <ValidateButton 
      onClick={handleValidate}
      disabled={!canValidate()}
    >
      ✓ Valider l'Évaluation
    </ValidateButton>
  </ModalActions>
</OverrideModal>
```

---

## 🔥 PRIORITY 3: Student Progress Monitoring

### Part A: View Student Attempts (All Cases)

#### API Call

```typescript
const fetchStudentAttempts = async (studentId: string, internshipId: string) => {
  const response = await fetch(
    `/api/internship/student/${studentId}/attempts?internship_id=${internshipId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
};
```

#### Response Format

```json
{
  "student_id": "65c1234567890abcdef12346",
  "internship_id": "65c1234567890abcdef12350",
  "overall_stats": {
    "total_cases_attempted": 8,
    "cases_passed": 6,
    "cases_in_progress": 2,
    "cases_failed": 0,
    "overall_average_score": 79.5,
    "total_attempts": 12,
    "best_overall_score": 90
  },
  "cases": [
    {
      "case_id": "65c1234567890abcdef12351",
      "case_title": "Mathilde Perez - Anamnèse",
      "step": 1,
      "case_type": "isolated",
      "total_attempts": 2,
      "best_score": 85,
      "average_score": 77.5,
      "current_status": "passed",
      "first_passed_at": "2026-02-06T11:00:00Z",
      "last_attempt_at": "2026-02-07T15:30:00Z",
      "attempts": [
        {
          "attempt_number": 1,
          "assessment_score": 70,
          "grade": "C",
          "pass_fail": "PASS",
          "completed_at": "2026-02-06T11:00:00Z"
        },
        {
          "attempt_number": 2,
          "assessment_score": 85,
          "grade": "B",
          "pass_fail": "PASS",
          "completed_at": "2026-02-07T15:30:00Z"
        }
      ]
    }
  ]
}
```

#### UI Components

```tsx
// Component: StudentProgressDashboard.tsx
<StudentProgressDashboard>
  <DashboardHeader>
    <StudentInfo>
      <Avatar src={student.avatar} size="large" />
      <StudentName>{student.first_name} {student.last_name}</StudentName>
      <StudentEmail>{student.email}</StudentEmail>
    </StudentInfo>
    <InternshipTitle>{internship.title}</InternshipTitle>
  </DashboardHeader>
  
  <OverallStatsCard>
    <CardTitle>Statistiques Globales</CardTitle>
    <StatsGrid>
      <StatItem>
        <StatIcon>📊</StatIcon>
        <StatValue>{overallStats.overall_average_score.toFixed(1)}/100</StatValue>
        <StatLabel>Score Moyen</StatLabel>
      </StatItem>
      
      <StatItem>
        <StatIcon>🎯</StatIcon>
        <StatValue>{overallStats.total_cases_attempted}</StatValue>
        <StatLabel>Cas Tentés</StatLabel>
      </StatItem>
      
      <StatItem>
        <StatIcon>✅</StatIcon>
        <StatValue>{overallStats.cases_passed}</StatValue>
        <StatLabel>Cas Réussis</StatLabel>
      </StatItem>
      
      <StatItem>
        <StatIcon>🔄</StatIcon>
        <StatValue>{overallStats.total_attempts}</StatValue>
        <StatLabel>Total Tentatives</StatLabel>
      </StatItem>
      
      <StatItem>
        <StatIcon>⭐</StatIcon>
        <StatValue>{overallStats.best_overall_score}/100</StatValue>
        <StatLabel>Meilleur Score</StatLabel>
      </StatItem>
      
      <StatItem>
        <StatIcon>⏳</StatIcon>
        <StatValue>{overallStats.cases_in_progress}</StatValue>
        <StatLabel>En Cours</StatLabel>
      </StatItem>
    </StatsGrid>
  </OverallStatsCard>
  
  <CaseBreakdownSection>
    <SectionTitle>Progression par Cas</SectionTitle>
    {cases.map(caseData => (
      <CaseProgressCard key={caseData.case_id}>
        <CardHeader>
          <CaseTitle>{caseData.case_title}</CaseTitle>
          <StepBadge step={caseData.step}>Étape {caseData.step}</StepBadge>
          <StatusBadge status={caseData.current_status}>
            {getStatusLabel(caseData.current_status)}
          </StatusBadge>
        </CardHeader>
        
        <CaseStats>
          <StatRow>
            <Label>Tentatives:</Label>
            <Value>{caseData.total_attempts}</Value>
          </StatRow>
          <StatRow>
            <Label>Meilleur Score:</Label>
            <Value color={getScoreColor(caseData.best_score)}>
              {caseData.best_score}/100
            </Value>
          </StatRow>
          <StatRow>
            <Label>Score Moyen:</Label>
            <Value>{caseData.average_score.toFixed(1)}/100</Value>
          </StatRow>
          {caseData.first_passed_at && (
            <StatRow>
              <Label>Réussi le:</Label>
              <Value>{formatDate(caseData.first_passed_at)}</Value>
            </StatRow>
          )}
        </CaseStats>
        
        <AttemptsTimeline>
          <TimelineTitle>Historique des Tentatives</TimelineTitle>
          {caseData.attempts.map(attempt => (
            <TimelineItem key={attempt.attempt_number}>
              <AttemptNumber>#{attempt.attempt_number}</AttemptNumber>
              <AttemptScore>{attempt.assessment_score}/100</AttemptScore>
              <AttemptGrade>{attempt.grade}</AttemptGrade>
              <AttemptBadge status={attempt.pass_fail}>
                {attempt.pass_fail}
              </AttemptBadge>
              <AttemptDate>{formatDate(attempt.completed_at)}</AttemptDate>
            </TimelineItem>
          ))}
        </AttemptsTimeline>
        
        <ViewDetailsButton onClick={() => handleViewCase(caseData.case_id)}>
          Voir Détails →
        </ViewDetailsButton>
      </CaseProgressCard>
    ))}
  </CaseBreakdownSection>
  
  <ProgressChart>
    <ChartTitle>Évolution Globale</ChartTitle>
    {/* Line chart showing score progression across all cases */}
    <LineChart data={getAllAttemptsChartData(cases)} />
  </ProgressChart>
</StudentProgressDashboard>
```

---

## 🔥 PRIORITY 4: Patient Progression View (Steps 2-3)

### API Call

```typescript
const fetchPatientProgression = async (patientBaseId: string, studentId: string) => {
  const response = await fetch(
    `/api/internship/patient-progression/${patientBaseId}/${studentId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
};
```

### UI Components

```tsx
// Component: PatientProgressionView.tsx
<PatientProgressionView>
  <ViewHeader>
    <PatientIcon>👤</PatientIcon>
    <PatientName>{getPatientName(patientBaseId)}</PatientName>
    <SubTitle>Progression à travers les cas</SubTitle>
  </ViewHeader>
  
  <ProgressionTimeline>
    {progression_history.map((session, index) => (
      <TimelineNode key={index}>
        <NodeConnector />
        <NodeCard>
          <NodeHeader>
            <SequenceNumber>Séance {session.sequence_in_step}</SequenceNumber>
            <CaseTitle>{session.case_title}</CaseTitle>
            {session.emdr_phase_focus && (
              <PhaseBadge>{session.emdr_phase_focus}</PhaseBadge>
            )}
          </NodeHeader>
          
          <PatientStateComparison>
            <StateTitle>État du Patient</StateTitle>
            <StateMetrics>
              <Metric>
                <Label>SUD:</Label>
                <Value color={getSUDColor(session.patient_state?.current_sud)}>
                  {session.patient_state?.current_sud || 'N/A'}/10
                </Value>
                {index > 0 && (
                  <ChangeIndicator change={calculateSUDChange(session, progression_history[index-1])}>
                    {formatChange(calculateSUDChange(session, progression_history[index-1]))}
                  </ChangeIndicator>
                )}
              </Metric>
              
              <Metric>
                <Label>VOC:</Label>
                <Value color={getVOCColor(session.patient_state?.current_voc)}>
                  {session.patient_state?.current_voc || 'N/A'}/7
                </Value>
                {index > 0 && (
                  <ChangeIndicator change={calculateVOCChange(session, progression_history[index-1])}>
                    {formatChange(calculateVOCChange(session, progression_history[index-1]))}
                  </ChangeIndicator>
                )}
              </Metric>
            </StateMetrics>
          </PatientStateComparison>
          
          {session.patient_state?.techniques_mastered && (
            <TechniquesSection>
              <SubTitle>Techniques Maîtrisées:</SubTitle>
              <TechniquesList>
                {session.patient_state.techniques_mastered.map(technique => (
                  <TechniqueBadge key={technique}>{technique}</TechniqueBadge>
                ))}
              </TechniquesList>
            </TechniquesSection>
          )}
          
          <StudentPerformance>
            <SubTitle>Performance Étudiant:</SubTitle>
            <Score>{session.best_score}/100</Score>
            <PassFail status={session.current_status}>
              {getStatusLabel(session.current_status)}
            </PassFail>
          </StudentPerformance>
          
          <SessionDate>{formatDate(session.last_attempt_at)}</SessionDate>
        </NodeCard>
      </TimelineNode>
    ))}
  </ProgressionTimeline>
  
  <ProgressionCharts>
    <ChartCard>
      <ChartTitle>Évolution SUD</ChartTitle>
      <LineChart
        data={progression_history.map(s => ({
          session: `S${s.sequence_in_step}`,
          sud: s.patient_state?.current_sud
        }))}
        yAxisDomain={[0, 10]}
        lineColor="#ef4444"
      />
    </ChartCard>
    
    <ChartCard>
      <ChartTitle>Évolution VOC</ChartTitle>
      <LineChart
        data={progression_history.map(s => ({
          session: `S${s.sequence_in_step}`,
          voc: s.patient_state?.current_voc
        }))}
        yAxisDomain={[1, 7]}
        lineColor="#10b981"
      />
    </ChartCard>
  </ProgressionCharts>
</PatientProgressionView>
```

---

## 📚 API Endpoints Reference

### Case Management
```
POST   /api/internship/{internshipId}/cases
GET    /api/internship/{internshipId}/cases
GET    /api/internship/cases/{caseId}
PATCH  /api/internship/cases/{caseId}
DELETE /api/internship/cases/{caseId}
```

### Feedback Management
```
GET    /api/internship/feedback/pending
GET    /api/internship/feedback/{feedbackId}
PATCH  /api/internship/feedback/{feedbackId}
POST   /api/internship/feedback/{feedbackId}/validate
```

### Student Progress
```
GET    /api/internship/cases/{caseId}/attempts
GET    /api/internship/student/{studentId}/attempts?internship_id={id}
GET    /api/internship/patient-progression/{patientBaseId}/{studentId}
```

---

## 🧪 Testing Checklist

### Case Creation
- [ ] Create Step 1 case (isolated)
- [ ] Create Step 2 case with patient_base_id
- [ ] Create Step 3 case with patient_base_id
- [ ] Verify assessment criteria total 100 points
- [ ] Test literature references
- [ ] Test pass threshold configuration
- [ ] Test patient state editor (Steps 2-3)

### Feedback Validation
- [ ] View pending feedback list
- [ ] Filter/search feedbacks
- [ ] View detailed assessment
- [ ] Override criteria scores
- [ ] Override overall score
- [ ] Add professor comments
- [ ] Validate assessment

### Student Monitoring
- [ ] View student overall stats
- [ ] View case-by-case breakdown
- [ ] View attempt timeline
- [ ] View progress charts
- [ ] Export reports

### Patient Progression
- [ ] View patient progression (Steps 2-3)
- [ ] Verify SUD/VOC evolution
- [ ] Check techniques mastered
- [ ] View progression charts

---

## 🎯 Success Criteria

Frontend integration is complete when:

- [ ] Cases can be created with all new fields
- [ ] Assessment criteria editor validates 100-point total
- [ ] Pass threshold is configurable
- [ ] Patient base ID works for Steps 2-3
- [ ] Pending feedback displays correctly
- [ ] Manual assessment override works
- [ ] Professor comments save properly
- [ ] Student progress dashboard displays
- [ ] Attempt history shows correctly
- [ ] Patient progression view works (Steps 2-3)
- [ ] All charts render properly
- [ ] Export functionality works
- [ ] Mobile responsive
- [ ] Loading/error states handled

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  
**Backend Status**: READY ✅  
**Frontend Status**: AWAITING INTEGRATION ⏳
