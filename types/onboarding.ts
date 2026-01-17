export interface OnboardingClientMetadata {
    onboarded?: boolean;
    teamDisplayName?: string; // Se você também ler isso no layout
    // Adicione outros campos do clientMetadata que possam ser relevantes em múltiplos lugares
  }
  
  // Se você tiver outros metadados, pode criar tipos mais específicos
  export interface FullClientMetadata extends OnboardingClientMetadata {
    accountType?: "individual" | "business";
    identifierValue?: string;
    businessType?: string;
    phone?: string;
    referralCode?: string;
    detectedTimezone?: string;
  }