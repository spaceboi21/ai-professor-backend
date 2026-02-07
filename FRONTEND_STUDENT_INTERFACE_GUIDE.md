# Student Interface - Comprehensive Assessment Integration Guide

**Date**: February 7, 2026  
**Backend Version**: Phase 4 Complete  
**Status**: Ready for Frontend Integration  
**Priority**: HIGH

---

## 🎯 What Changed & Why

### The Big Picture

We've replaced the **real-time supervisor feedback system** with a **comprehensive session-end assessment system** that:

1. ✅ Generates detailed assessments at the END of each session (60-75 min)
2. ✅ Tracks ALL student attempts (unlimited retries)
3. ✅ Shows evolution across attempts
4. ✅ Remembers patient history across sessions (Steps 2-3)
5. ✅ Provides structured grading (A-F) and pass/fail

**No more real-time tips** (disabled by default, only for emergencies).

---

## 📋 Student Interface Updates Required

### Priority 1: Assessment Results Display (CRITICAL)

### Priority 2: Attempt History View

### Priority 3: Patient Context View (Steps 2-3)

### Priority 4: Case Information Display

---

## 🔥 PRIORITY 1: Assessment Results Display

### Where: After Session Completion

**Trigger**: When student completes a session (`POST /internship/sessions/:sessionId/complete`)

### API Call

```typescript
// After session complete
const response = await fetch(`/api/internship/sessions/${sessionId}/feedback`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const assessment = await response.json();
```

### Response Format

```json
{
  "data": {
    "ai_feedback": {
      "overall_score": 82,
      "grade": "B",
      "pass_fail": "PASS",
      "pass_threshold": 70,
      "criteria_scores": [
        {
          "criterion_id": "anamnesis",
          "criterion_name": "Anamnesis",
          "points_earned": 22,
          "points_max": 25,
          "percentage": 88,
          "feedback": "Excellente collecte des traumatismes. Vous avez bien documenté l'histoire de la patiente, incluant les violences subies et le harcèlement scolaire. Bonne exploration des symptômes actuels.",
          "evidence_from_conversation": [
            "Message 15: 'Pouvez-vous me décrire ce qui s'est passé avec votre professeure de flûte?' - Bonne question ouverte",
            "Message 23: Validation des émotions de la patiente"
          ]
        },
        {
          "criterion_id": "stability",
          "criterion_name": "Stability Assessment",
          "points_earned": 18,
          "points_max": 25,
          "percentage": 72,
          "feedback": "Évaluation des ressources effectuée mais manque de profondeur. Vous avez identifié le soutien familial mais n'avez pas exploré les stratégies de coping actuelles.",
          "evidence_from_conversation": [
            "Message 30: Question sur la famille - bien",
            "Manque: Pas de question sur les ressources internes"
          ]
        },
        {
          "criterion_id": "target_hierarchy",
          "criterion_name": "Target Hierarchy",
          "points_earned": 21,
          "points_max": 25,
          "percentage": 84,
          "feedback": "Bonne hiérarchisation des cibles. Vous avez correctement identifié la scène du miroir comme cible principale (SUD=8).",
          "evidence_from_conversation": [
            "Message 45: 'Quelle est la scène qui vous perturbe le plus?' - Excellent"
          ]
        },
        {
          "criterion_id": "empathy",
          "criterion_name": "Empathic Posture",
          "points_earned": 21,
          "points_max": 25,
          "percentage": 84,
          "feedback": "Bonne posture empathique générale. Validation des émotions présente. Quelques moments où vous avez interrompu la patiente.",
          "evidence_from_conversation": [
            "Message 12: 'Je comprends que c'était très difficile' - Bien",
            "Message 28: Interruption pendant récit - À améliorer"
          ]
        }
      ],
      "strengths": [
        "Excellente identification des traumatismes primaires et secondaires",
        "Bonne adhésion au protocole EMDR Phase 1",
        "Posture empathique maintenue tout au long de la séance",
        "Hiérarchisation correcte des cibles traumatiques"
      ],
      "areas_for_improvement": [
        "Approfondir l'évaluation des ressources internes de la patiente",
        "Éviter d'interrompre la patiente pendant les récits traumatiques",
        "Explorer davantage les stratégies de coping actuelles",
        "Poser plus de questions sur le réseau de soutien social"
      ],
      "recommendations_next_session": [
        "Pratiquer l'installation du lieu sûr avec la patiente",
        "Revoir Shapiro EMDR Manual p.160-170 sur l'évaluation des ressources",
        "Travailler sur l'écoute active sans interruption",
        "Se préparer pour Phase 2 : Préparation du retraitement"
      ],
      "evolution_vs_previous_attempts": "Deuxième tentative : Amélioration significative de 7 points (+9%). Meilleure hiérarchisation des cibles (+12%). Évaluation de la stabilité encore à renforcer. Posture empathique stable.",
      "literature_adherence": {
        "Shapiro EMDR Manual": "Protocole Phase 1 correctement suivi. Pages 145-155 : Anamnèse complète effectuée. Page 148 : Évaluation de stabilité partiellement réalisée. Recommandation : Revoir pages 148-150 pour approfondir l'évaluation des ressources."
      }
    },
    "professor_feedback": {
      // Will be empty initially, filled after professor validation
    },
    "status": "pending_validation",
    "created_at": "2026-02-07T11:05:32Z"
  }
}
```

### UI Components to Create

#### 1. Assessment Summary Card

```tsx
// Component: AssessmentSummary.tsx
interface AssessmentSummaryProps {
  score: number;
  grade: string;
  passFail: 'PASS' | 'FAIL';
  threshold: number;
}

// Example render:
<AssessmentSummaryCard>
  <ScoreDisplay>
    <CircularProgress value={82} size="large" color={passFail === 'PASS' ? 'green' : 'red'}>
      <ScoreText>82/100</ScoreText>
    </CircularProgress>
    <GradeBadge color={getGradeColor('B')}>Grade: B</GradeBadge>
    <PassFailBadge status="PASS">✅ RÉUSSI</PassFailBadge>
  </ScoreDisplay>
  <ThresholdInfo>
    Seuil de réussite: {threshold}% | Votre score: {score}%
  </ThresholdInfo>
</AssessmentSummaryCard>
```

**Grading Scale**:
```typescript
const getGradeColor = (grade: string) => {
  const colors = {
    'A': '#10b981', // Green
    'B': '#3b82f6', // Blue
    'C': '#f59e0b', // Orange
    'D': '#ef4444', // Red
    'F': '#991b1b'  // Dark Red
  };
  return colors[grade] || '#6b7280';
};

const getGradeLabel = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};
```

#### 2. Criteria Breakdown

```tsx
// Component: CriteriaBreakdown.tsx
interface Criterion {
  criterion_id: string;
  criterion_name: string;
  points_earned: number;
  points_max: number;
  percentage: number;
  feedback: string;
  evidence_from_conversation: string[];
}

<CriteriaSection>
  <SectionTitle>Détail par Critère</SectionTitle>
  {criteria_scores.map(criterion => (
    <CriterionCard key={criterion.criterion_id}>
      <CriterionHeader>
        <CriterionName>{criterion.criterion_name}</CriterionName>
        <CriterionScore>
          {criterion.points_earned}/{criterion.points_max} pts
          <PercentageBadge color={getScoreColor(criterion.percentage)}>
            {criterion.percentage}%
          </PercentageBadge>
        </CriterionScore>
      </CriterionHeader>
      
      <ProgressBar 
        value={criterion.percentage} 
        color={getScoreColor(criterion.percentage)}
      />
      
      <FeedbackText>{criterion.feedback}</FeedbackText>
      
      {criterion.evidence_from_conversation.length > 0 && (
        <EvidenceSection>
          <EvidenceTitle>📝 Exemples de la conversation :</EvidenceTitle>
          <EvidenceList>
            {criterion.evidence_from_conversation.map((evidence, idx) => (
              <EvidenceItem key={idx}>{evidence}</EvidenceItem>
            ))}
          </EvidenceList>
        </EvidenceSection>
      )}
    </CriterionCard>
  ))}
</CriteriaSection>
```

**Score Colors**:
```typescript
const getScoreColor = (percentage: number) => {
  if (percentage >= 85) return '#10b981'; // Excellent
  if (percentage >= 70) return '#3b82f6'; // Bien
  if (percentage >= 60) return '#f59e0b'; // Passable
  return '#ef4444'; // Insuffisant
};
```

#### 3. Strengths & Weaknesses

```tsx
// Component: StrengthsWeaknesses.tsx
<InsightsGrid>
  <StrengthsColumn>
    <ColumnHeader>
      <Icon>💪</Icon>
      <Title>Points Forts</Title>
    </ColumnHeader>
    <ItemList>
      {strengths.map((strength, idx) => (
        <StrengthItem key={idx}>
          <CheckIcon>✓</CheckIcon>
          <ItemText>{strength}</ItemText>
        </StrengthItem>
      ))}
    </ItemList>
  </StrengthsColumn>
  
  <WeaknessesColumn>
    <ColumnHeader>
      <Icon>🎯</Icon>
      <Title>Axes d'Amélioration</Title>
    </ColumnHeader>
    <ItemList>
      {areas_for_improvement.map((area, idx) => (
        <ImprovementItem key={idx}>
          <TargetIcon>→</TargetIcon>
          <ItemText>{area}</ItemText>
        </ImprovementItem>
      ))}
    </ItemList>
  </WeaknessesColumn>
</InsightsGrid>
```

#### 4. Recommendations

```tsx
// Component: Recommendations.tsx
<RecommendationsSection>
  <SectionHeader>
    <Icon>📚</Icon>
    <Title>Recommandations pour la Prochaine Séance</Title>
  </SectionHeader>
  <RecommendationsList>
    {recommendations_next_session.map((rec, idx) => (
      <RecommendationCard key={idx}>
        <NumberBadge>{idx + 1}</NumberBadge>
        <RecommendationText>{rec}</RecommendationText>
      </RecommendationCard>
    ))}
  </RecommendationsList>
</RecommendationsSection>
```

#### 5. Evolution Tracker (if multiple attempts)

```tsx
// Component: EvolutionTracker.tsx
{evolution_vs_previous_attempts && (
  <EvolutionSection>
    <SectionHeader>
      <Icon>📈</Icon>
      <Title>Votre Évolution</Title>
    </SectionHeader>
    <EvolutionCard>
      <EvolutionText>{evolution_vs_previous_attempts}</EvolutionText>
    </EvolutionCard>
  </EvolutionSection>
)}
```

#### 6. Literature Adherence

```tsx
// Component: LiteratureAdherence.tsx
{Object.entries(literature_adherence).map(([title, feedback]) => (
  <LiteratureCard key={title}>
    <BookIcon>📖</BookIcon>
    <LiteratureTitle>{title}</LiteratureTitle>
    <LiteratureFeedback>{feedback}</LiteratureFeedback>
  </LiteratureCard>
))}
```

### Complete Page Layout

```tsx
// Page: AssessmentResultsPage.tsx
<AssessmentResultsPage>
  <PageHeader>
    <BackButton onClick={handleBack}>← Retour</BackButton>
    <Title>Résultats de l'Évaluation</Title>
    <CaseTitle>{caseTitle}</CaseTitle>
  </PageHeader>
  
  {/* Main Assessment Summary */}
  <AssessmentSummary 
    score={assessment.overall_score}
    grade={assessment.grade}
    passFail={assessment.pass_fail}
    threshold={assessment.pass_threshold}
  />
  
  {/* Criteria Breakdown */}
  <CriteriaBreakdown criteria={assessment.criteria_scores} />
  
  {/* Strengths & Weaknesses */}
  <StrengthsWeaknesses 
    strengths={assessment.strengths}
    weaknesses={assessment.areas_for_improvement}
  />
  
  {/* Evolution (if retry) */}
  {assessment.evolution_vs_previous_attempts && (
    <EvolutionTracker evolution={assessment.evolution_vs_previous_attempts} />
  )}
  
  {/* Recommendations */}
  <Recommendations recommendations={assessment.recommendations_next_session} />
  
  {/* Literature Adherence */}
  {Object.keys(assessment.literature_adherence).length > 0 && (
    <LiteratureAdherence adherence={assessment.literature_adherence} />
  )}
  
  {/* Action Buttons */}
  <ActionButtons>
    {assessment.pass_fail === 'FAIL' && (
      <RetryButton onClick={handleRetry}>
        🔄 Réessayer ce Cas
      </RetryButton>
    )}
    <NextButton onClick={handleNextCase}>
      Continuer →
    </NextButton>
    <DownloadButton onClick={handleDownloadPDF}>
      📄 Télécharger PDF
    </DownloadButton>
  </ActionButtons>
</AssessmentResultsPage>
```

---

## 🔥 PRIORITY 2: Attempt History View

### Where: Case Detail Page / Student Dashboard

### API Call

```typescript
const fetchAttemptHistory = async (caseId: string) => {
  const response = await fetch(`/api/internship/cases/${caseId}/attempts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
```

### Response Format

```json
{
  "total_attempts": 3,
  "best_score": 85,
  "average_score": 78,
  "current_status": "passed",
  "first_passed_at": "2026-02-07T11:05:32Z",
  "last_attempt_at": "2026-02-07T15:30:00Z",
  "attempts": [
    {
      "attempt_number": 1,
      "session_id": "65c1234567890abcdef12345",
      "assessment_id": "65c1234567890abcdef12346",
      "assessment_score": 70,
      "grade": "C",
      "pass_fail": "PASS",
      "pass_threshold": 70,
      "key_learnings": [
        "Bonne identification des traumatismes",
        "Protocole EMDR Phase 1 respecté"
      ],
      "mistakes_made": [
        "Interruption de la patiente",
        "Évaluation de stabilité incomplète"
      ],
      "strengths": [
        "Bonne posture empathique",
        "Questions ouvertes appropriées"
      ],
      "areas_for_improvement": [
        "Écoute active",
        "Évaluation des ressources"
      ],
      "completed_at": "2026-02-05T11:00:00Z"
    },
    {
      "attempt_number": 2,
      "assessment_score": 75,
      "grade": "C",
      "pass_fail": "PASS",
      "completed_at": "2026-02-06T14:30:00Z"
    },
    {
      "attempt_number": 3,
      "assessment_score": 85,
      "grade": "B",
      "pass_fail": "PASS",
      "completed_at": "2026-02-07T15:30:00Z"
    }
  ]
}
```

### UI Components

#### 1. Attempt History Summary

```tsx
// Component: AttemptHistorySummary.tsx
<AttemptSummaryCard>
  <StatsGrid>
    <StatItem>
      <StatLabel>Total Tentatives</StatLabel>
      <StatValue>{total_attempts}</StatValue>
    </StatItem>
    <StatItem>
      <StatLabel>Meilleur Score</StatLabel>
      <StatValue color="green">{best_score}/100</StatValue>
    </StatItem>
    <StatItem>
      <StatLabel>Score Moyen</StatLabel>
      <StatValue>{average_score}/100</StatValue>
    </StatItem>
    <StatItem>
      <StatLabel>Statut</StatLabel>
      <StatusBadge status={current_status}>
        {getStatusLabel(current_status)}
      </StatusBadge>
    </StatItem>
  </StatsGrid>
  
  {first_passed_at && (
    <PassedInfo>
      ✅ Cas réussi le {formatDate(first_passed_at)}
    </PassedInfo>
  )}
</AttemptSummaryCard>
```

#### 2. Attempt Timeline

```tsx
// Component: AttemptTimeline.tsx
<AttemptTimeline>
  {attempts.map(attempt => (
    <TimelineItem key={attempt.attempt_number}>
      <AttemptNumber>{attempt.attempt_number}</AttemptNumber>
      <TimelineLine />
      <AttemptCard>
        <AttemptHeader>
          <AttemptTitle>Tentative #{attempt.attempt_number}</AttemptTitle>
          <AttemptDate>{formatDate(attempt.completed_at)}</AttemptDate>
        </AttemptHeader>
        
        <ScoreRow>
          <Score>{attempt.assessment_score}/100</Score>
          <Grade color={getGradeColor(attempt.grade)}>{attempt.grade}</Grade>
          <PassFailBadge status={attempt.pass_fail}>
            {attempt.pass_fail === 'PASS' ? '✅ Réussi' : '❌ Échoué'}
          </PassFailBadge>
        </ScoreRow>
        
        {attempt.key_learnings && attempt.key_learnings.length > 0 && (
          <KeyLearnings>
            <SubTitle>📚 Apprentissages Clés:</SubTitle>
            <List>
              {attempt.key_learnings.map((learning, idx) => (
                <ListItem key={idx}>{learning}</ListItem>
              ))}
            </List>
          </KeyLearnings>
        )}
        
        {attempt.mistakes_made && attempt.mistakes_made.length > 0 && (
          <Mistakes>
            <SubTitle>⚠️ Erreurs à Corriger:</SubTitle>
            <List>
              {attempt.mistakes_made.map((mistake, idx) => (
                <ListItem key={idx}>{mistake}</ListItem>
              ))}
            </List>
          </Mistakes>
        )}
        
        <ViewDetailsButton onClick={() => handleViewAttempt(attempt.session_id)}>
          Voir Détails →
        </ViewDetailsButton>
      </AttemptCard>
    </TimelineItem>
  ))}
</AttemptTimeline>
```

#### 3. Progress Chart

```tsx
// Component: ProgressChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const chartData = attempts.map(attempt => ({
  attempt: `#${attempt.attempt_number}`,
  score: attempt.assessment_score,
  date: new Date(attempt.completed_at).toLocaleDateString()
}));

<ProgressChartCard>
  <ChartTitle>Évolution des Scores</ChartTitle>
  <LineChart width={600} height={300} data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="attempt" />
    <YAxis domain={[0, 100]} />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="score" 
      stroke="#3b82f6" 
      strokeWidth={2}
      dot={{ r: 6 }}
    />
  </LineChart>
</ProgressChartCard>
```

---

## 🔥 PRIORITY 3: Patient Context View (Steps 2-3 ONLY)

### Where: Before Starting Session (Steps 2-3 only)

### When to Show

```typescript
// Only show for cases with:
// - step >= 2
// - patient_base_id !== null
const shouldShowPatientContext = (caseData: Case) => {
  return caseData.step >= 2 && caseData.patient_base_id !== null;
};
```

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

### Response Format

```json
{
  "found": true,
  "patient_base_id": "brigitte_fenurel",
  "progression_history": [
    {
      "case_id": "65c1234567890abcdef12347",
      "case_title": "Brigitte Fenurel - Phase 1-2",
      "step": 2,
      "sequence_in_step": 1,
      "emdr_phase_focus": "Phase 1-2",
      "session_narrative": null,
      "patient_state": {
        "current_sud": 6,
        "current_voc": 2,
        "safe_place_established": true,
        "trauma_targets_resolved": [],
        "techniques_mastered": ["anamnesis", "safe_place"],
        "progress_trajectory": "improvement"
      },
      "attempts": [
        {
          "attempt_number": 1,
          "assessment_score": 80,
          "grade": "B",
          "pass_fail": "PASS",
          "completed_at": "2026-02-05T11:00:00Z"
        }
      ],
      "best_score": 80,
      "current_status": "passed",
      "last_attempt_at": "2026-02-05T11:00:00Z"
    },
    {
      "case_id": "65c1234567890abcdef12348",
      "case_title": "Brigitte Fenurel - Phase 3-4",
      "step": 2,
      "sequence_in_step": 2,
      "emdr_phase_focus": "Phase 3-4",
      "patient_state": {
        "current_sud": 4,
        "current_voc": 4,
        "safe_place_established": true,
        "trauma_targets_resolved": ["workplace_stress"],
        "techniques_mastered": ["anamnesis", "safe_place", "bilateral_stimulation"],
        "progress_trajectory": "improvement"
      },
      "attempts": [
        {
          "attempt_number": 1,
          "assessment_score": 85,
          "grade": "B",
          "pass_fail": "PASS",
          "completed_at": "2026-02-06T14:30:00Z"
        }
      ],
      "best_score": 85,
      "current_status": "passed",
      "last_attempt_at": "2026-02-06T14:30:00Z"
    }
  ]
}
```

### UI Components

#### 1. Patient Context Modal (Before Session)

```tsx
// Component: PatientContextModal.tsx
<PatientContextModal isOpen={showContext} onClose={handleStartSession}>
  <ModalHeader>
    <PatientIcon>👤</PatientIcon>
    <PatientName>{getPatientName(patientBaseId)}</PatientName>
    <SubTitle>Contexte du Patient (Séances Précédentes)</SubTitle>
  </ModalHeader>
  
  <CurrentStateCard>
    <CardTitle>État Actuel du Patient</CardTitle>
    <StateGrid>
      <StateItem>
        <Label>SUD (Distress)</Label>
        <Value color={getSUDColor(currentState.current_sud)}>
          {currentState.current_sud}/10
        </Value>
        <ProgressBar value={currentState.current_sud * 10} color={getSUDColor(currentState.current_sud)} />
      </StateItem>
      
      <StateItem>
        <Label>VOC (Belief)</Label>
        <Value color={getVOCColor(currentState.current_voc)}>
          {currentState.current_voc}/7
        </Value>
        <ProgressBar value={(currentState.current_voc / 7) * 100} color={getVOCColor(currentState.current_voc)} />
      </StateItem>
      
      <StateItem>
        <Label>Lieu Sûr</Label>
        <Value>
          {currentState.safe_place_established ? '✅ Établi' : '❌ Non établi'}
        </Value>
      </StateItem>
      
      <StateItem>
        <Label>Trajectoire</Label>
        <TrajectoryBadge trajectory={currentState.progress_trajectory}>
          {getTrajectoryLabel(currentState.progress_trajectory)}
        </TrajectoryBadge>
      </StateItem>
    </StateGrid>
  </CurrentStateCard>
  
  <TechniquesMasteredCard>
    <CardTitle>Techniques Maîtrisées</CardTitle>
    <TechniquesList>
      {currentState.techniques_mastered.map(technique => (
        <TechniqueBadge key={technique}>
          ✓ {getTechniqueLabel(technique)}
        </TechniqueBadge>
      ))}
    </TechniquesList>
  </TechniquesMasteredCard>
  
  {currentState.trauma_targets_resolved.length > 0 && (
    <TargetsResolvedCard>
      <CardTitle>Cibles Traumatiques Résolues</CardTitle>
      <TargetsList>
        {currentState.trauma_targets_resolved.map(target => (
          <TargetItem key={target}>✓ {target}</TargetItem>
        ))}
      </TargetsList>
    </TargetsResolvedCard>
  )}
  
  <ProgressionTimelineCard>
    <CardTitle>Historique des Séances</CardTitle>
    <Timeline>
      {progression_history.map((session, idx) => (
        <TimelineItem key={idx}>
          <SessionNumber>Séance {session.sequence_in_step}</SessionNumber>
          <SessionTitle>{session.emdr_phase_focus}</SessionTitle>
          <SessionScore>Score: {session.best_score}/100</SessionScore>
          <SessionDate>{formatDate(session.last_attempt_at)}</SessionDate>
        </TimelineItem>
      ))}
    </Timeline>
  </ProgressionTimelineCard>
  
  <StartButton onClick={handleStartSession}>
    Commencer la Séance →
  </StartButton>
</PatientContextModal>
```

**Helper Functions**:

```typescript
const getSUDColor = (sud: number) => {
  if (sud <= 2) return '#10b981'; // Low distress - good
  if (sud <= 5) return '#f59e0b'; // Medium
  return '#ef4444'; // High distress
};

const getVOCColor = (voc: number) => {
  if (voc >= 6) return '#10b981'; // Strong belief - good
  if (voc >= 4) return '#f59e0b'; // Medium
  return '#ef4444'; // Weak belief
};

const getTrajectoryLabel = (trajectory: string) => {
  const labels = {
    'improvement': '📈 En Amélioration',
    'stable': '➡️ Stable',
    'regression': '📉 Régression',
    'breakthrough': '🎉 Percée Majeure'
  };
  return labels[trajectory] || 'Non défini';
};

const getTechniqueLabel = (technique: string) => {
  const labels = {
    'anamnesis': 'Anamnèse',
    'safe_place': 'Lieu Sûr',
    'bilateral_stimulation': 'Stimulation Bilatérale',
    'body_scan': 'Balayage Corporel',
    'container': 'Coffre',
    'resource_development': 'Développement des Ressources'
  };
  return labels[technique] || technique;
};
```

---

## 🔥 PRIORITY 4: Case Information Display

### Where: Case Selection / Case Detail Page

### Case Structure to Display

Cases now have a **3-step structure**:

#### Step 1: Isolated Cases (5 different patients)
- 1 session per patient
- No cross-contamination
- Example: Mathilde Perez, France Martin, Claire Verin

#### Step 2: Progressive Cases (7 cases, SAME patient)
- Same patient evolving through EMDR phases
- AI remembers previous sessions
- Example: Brigitte Case 1 (Phase 1-2) → Case 2 (Phase 3-4)

#### Step 3: Realistic Cases (15 cases, SAME patient)
- Same patient with non-linear evolution
- Relapses, breakthroughs, regressions
- Example: Brigitte Case 1-15 (full therapy journey)

### UI Components

#### 1. Case Card Display

```tsx
// Component: CaseCard.tsx
<CaseCard>
  <CaseHeader>
    <StepBadge step={caseData.step}>
      {getStepLabel(caseData.step)}
    </StepBadge>
    <CaseTypeBadge type={caseData.case_type}>
      {getCaseTypeLabel(caseData.case_type)}
    </CaseTypeBadge>
  </CaseHeader>
  
  <CaseTitle>{caseData.title}</CaseTitle>
  <CaseDescription>{caseData.description}</CaseDescription>
  
  {caseData.patient_base_id && (
    <PatientInfo>
      <PatientIcon>👤</PatientIcon>
      <PatientName>Patient: {getPatientName(caseData.patient_base_id)}</PatientName>
      {caseData.sequence_in_step > 1 && (
        <SequenceBadge>
          Séance #{caseData.sequence_in_step}
        </SequenceBadge>
      )}
    </PatientInfo>
  )}
  
  {caseData.emdr_phase_focus && (
    <PhaseFocus>
      <Icon>🎯</Icon>
      <Text>Focus: {caseData.emdr_phase_focus}</Text>
    </PhaseFocus>
  )}
  
  <CriteriaInfo>
    <Icon>📊</Icon>
    <Text>{caseData.assessment_criteria.length} critères d'évaluation</Text>
  </CriteriaInfo>
  
  <PassThreshold>
    <Icon>✅</Icon>
    <Text>Seuil de réussite: {caseData.pass_threshold}%</Text>
  </PassThreshold>
  
  <StartButton onClick={() => handleStartCase(caseData._id)}>
    Commencer →
  </StartButton>
</CaseCard>
```

**Helper Functions**:

```typescript
const getStepLabel = (step: number) => {
  const labels = {
    1: 'Étape 1: Cas Isolés',
    2: 'Étape 2: Protocole Progressif',
    3: 'Étape 3: Parcours Réaliste'
  };
  return labels[step] || `Étape ${step}`;
};

const getCaseTypeLabel = (type: string) => {
  const labels = {
    'isolated': 'Cas Isolé',
    'progressive': 'Évolution Progressive',
    'realistic': 'Parcours Réaliste'
  };
  return labels[type] || type;
};
```

---

## 🎨 Design Guidelines

### Colors

```typescript
// Assessment Scores
const SCORE_COLORS = {
  excellent: '#10b981', // 85-100%
  good: '#3b82f6',      // 70-84%
  fair: '#f59e0b',      // 60-69%
  poor: '#ef4444'       // 0-59%
};

// Pass/Fail
const STATUS_COLORS = {
  pass: '#10b981',
  fail: '#ef4444'
};

// Grades
const GRADE_COLORS = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#ef4444',
  F: '#991b1b'
};

// Steps
const STEP_COLORS = {
  1: '#8b5cf6', // Purple
  2: '#3b82f6', // Blue
  3: '#10b981'  // Green
};
```

### Typography

```css
/* Titles */
.assessment-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

/* Scores */
.score-large {
  font-size: 48px;
  font-weight: 800;
}

/* Criteria */
.criterion-name {
  font-size: 18px;
  font-weight: 600;
}

/* Feedback */
.feedback-text {
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
}
```

### Spacing

```css
/* Cards */
.assessment-card {
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Sections */
.section-spacing {
  margin-bottom: 32px;
}

/* Items */
.list-item {
  padding: 12px;
  margin-bottom: 8px;
}
```

---

## 🧪 Testing Checklist

### Step 1: Assessment Display
- [ ] Complete a test session
- [ ] Verify assessment loads after completion
- [ ] Check all criteria scores display correctly
- [ ] Verify pass/fail logic works
- [ ] Test retry button (if failed)
- [ ] Verify PDF download works

### Step 2: Attempt History
- [ ] Complete multiple sessions on same case
- [ ] Verify all attempts show in timeline
- [ ] Check stats calculations (best, average)
- [ ] Verify progress chart renders
- [ ] Test click to view individual attempt details

### Step 3: Patient Context (Steps 2-3)
- [ ] Start Step 2 case with patient_base_id
- [ ] Verify patient context modal shows before session
- [ ] Check SUD/VOC progression displays
- [ ] Verify techniques mastered list correct
- [ ] Test session history timeline

### Step 4: Case Display
- [ ] Verify step badge displays correctly
- [ ] Check case type badge shows
- [ ] Verify patient info shows for Steps 2-3
- [ ] Check EMDR phase focus displays
- [ ] Verify criteria count correct
- [ ] Test pass threshold displays

---

## 🚨 Important Notes

### 1. Real-Time Tips are DISABLED

**DO NOT** show real-time tips by default. They are disabled via feature flag.

```typescript
// OLD: Real-time tips (DISABLED)
// session.realtime_tips - IGNORE THIS FIELD

// NEW: Session-end assessment only
// assessment.criteria_scores
// assessment.strengths
// assessment.areas_for_improvement
```

### 2. Unlimited Retries

Students can retry any case **unlimited times**. Always show retry button for failed cases, and offer retry option even for passed cases if student wants to improve.

```tsx
<ActionButtons>
  {assessment.pass_fail === 'FAIL' && (
    <RetryButton primary onClick={handleRetry}>
      🔄 Réessayer pour Réussir
    </RetryButton>
  )}
  {assessment.pass_fail === 'PASS' && (
    <RetryButton secondary onClick={handleRetry}>
      📈 Réessayer pour Améliorer
    </RetryButton>
  )}
</ActionButtons>
```

### 3. Patient Memory (Steps 2-3 Only)

Only show patient context for:
- Cases with `step >= 2`
- Cases with `patient_base_id !== null`

```typescript
const shouldShowPatientContext = (caseData: Case) => {
  return caseData.step >= 2 && caseData.patient_base_id !== null;
};
```

### 4. Assessment Language

Assessments are primarily in **French** but may include English. Handle both languages gracefully.

---

## 📞 API Endpoints Quick Reference

### Get Assessment
```
GET /api/internship/sessions/{sessionId}/feedback
Authorization: Bearer {token}
```

### Get Attempt History
```
GET /api/internship/cases/{caseId}/attempts
Authorization: Bearer {token}
```

### Get Patient Progression (Steps 2-3)
```
GET /api/internship/patient-progression/{patientBaseId}/{studentId}
Authorization: Bearer {token}
```

### Get All Student Attempts
```
GET /api/internship/student/{studentId}/attempts?internship_id={internshipId}
Authorization: Bearer {token}
```

---

## 🎯 Success Criteria

Your frontend integration is **complete and correct** when:

- [ ] Assessment results display after session completion
- [ ] All criteria scores show with percentages
- [ ] Strengths & weaknesses clearly visible
- [ ] Recommendations display properly
- [ ] Evolution tracker works (multiple attempts)
- [ ] Attempt history timeline displays
- [ ] Progress chart renders correctly
- [ ] Patient context shows for Steps 2-3
- [ ] Case information displays step/type badges
- [ ] Retry functionality works
- [ ] PDF download works
- [ ] All colors/styling match design
- [ ] Mobile responsive
- [ ] Loading states handled
- [ ] Error states handled

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  
**Backend Status**: READY ✅  
**Frontend Status**: AWAITING INTEGRATION ⏳
