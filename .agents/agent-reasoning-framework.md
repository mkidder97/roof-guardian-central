# Agent Reasoning & Planning Framework

## Universal Reasoning Protocol
All agents MUST use this structured reasoning approach before executing any task.

### Phase 1: Analysis & Planning
```markdown
## TASK ANALYSIS
**Objective**: [Clear, measurable goal]
**Context**: [Current state, constraints, available resources]
**Stakeholders**: [Who is affected by this task]
**Dependencies**: [Prerequisites, blocking factors]
**Success Criteria**: [Specific, measurable outcomes]

## REASONING PROCESS
1. **Problem Decomposition**
   - Break complex tasks into atomic, manageable units
   - Identify critical path and parallel execution opportunities
   - Map interdependencies between subtasks

2. **Domain Knowledge Application**
   - Apply RoofMind-specific business rules and constraints
   - Consider industry best practices for roof inspection
   - Account for seasonal, weather, and geographic factors

3. **Risk Assessment & Mitigation**
   - Identify potential failure points and their impact
   - Design fallback strategies and recovery mechanisms
   - Plan monitoring and early warning indicators

4. **Resource Optimization**
   - Estimate time, computational, and external API costs
   - Identify opportunities for caching and reuse
   - Plan for scalability and performance requirements

5. **Quality Assurance Planning**
   - Define validation checkpoints throughout execution
   - Plan testing scenarios including edge cases
   - Establish rollback procedures for failures

## EXECUTION PLAN
**Phase 1**: [Preparation and validation]
**Phase 2**: [Core implementation]
**Phase 3**: [Testing and verification]
**Phase 4**: [Deployment and monitoring]

**Timeline**: [Realistic estimates with buffers]
**Resources**: [Required tools, APIs, dependencies]
**Monitoring**: [Key metrics and checkpoints]

## CROSS-AGENT COORDINATION
**Required Collaborations**: [Which agents need to be involved]
**Handoff Points**: [When and how to transfer responsibility]
**Communication Protocol**: [How to coordinate effectively]
```

### Phase 2: Continuous Reasoning During Execution
```markdown
## ADAPTIVE REASONING
At each major decision point:

1. **Situational Assessment**
   - Current progress vs. plan
   - New information or changed conditions
   - Resource availability and constraints

2. **Decision Matrix**
   - Available options and their trade-offs
   - Probability of success for each option
   - Impact on overall objectives

3. **Course Correction**
   - Adjust plan based on new information
   - Communicate changes to dependent agents
   - Update success criteria if necessary
```

## Advanced Context Protocols

### 1. Domain Context Protocol
Every agent must maintain deep understanding of:

```typescript
interface RoofMindDomainContext {
  business_model: {
    clients: 'Property management companies, real estate owners';
    services: 'Roof inspections, maintenance planning, warranty management';
    value_prop: 'Predictive maintenance, cost reduction, compliance';
    pain_points: 'Manual processes, data silos, reactive maintenance';
  };
  
  inspection_lifecycle: {
    campaign_creation: 'Property selection → Grouping → Communication';
    scheduling: 'Availability → Optimization → Confirmation';
    execution: 'Pre-briefing → Inspection → Reporting';
    follow_up: 'Analysis → Recommendations → Work orders';
  };
  
  stakeholder_ecosystem: {
    property_managers: 'Decision makers, budget holders, site coordinators';
    inspectors: 'Field workers, technical experts, mobile users';
    site_contacts: 'Local access, safety, property knowledge';
    clients: 'Portfolio owners, compliance requirements, ROI focus';
  };
  
  technical_constraints: {
    offline_requirements: 'Field inspectors often lack reliable connectivity';
    mobile_first: 'Primary interface is mobile devices in challenging conditions';
    real_time_sync: 'Multiple users updating same data simultaneously';
    regulatory_compliance: 'Audit trails, data retention, security requirements';
  };
}
```

### 2. Performance Context Protocol
```typescript
interface PerformanceContext {
  user_expectations: {
    response_time: {
      dashboard_load: '<3 seconds';
      property_search: '<1 second';
      inspection_sync: '<30 seconds';
      route_optimization: '<2 minutes';
    };
    availability: {
      uptime: '99.9%';
      peak_hours: '6 AM - 6 PM local time zones';
      seasonal_spikes: 'Spring/Fall inspection seasons';
    };
  };
  
  scalability_targets: {
    properties: '100K+ properties per client';
    concurrent_inspectors: '500+ simultaneous users';
    data_volume: '10TB+ of inspection photos/reports';
    campaign_size: '5K+ properties per campaign';
  };
  
  optimization_priorities: {
    inspector_productivity: 'Reduce inspection time by 40%';
    travel_efficiency: 'Minimize travel time between properties';
    data_accuracy: 'Eliminate manual data entry errors';
    predictive_value: 'Increase repair cost prediction accuracy to 85%';
  };
}
```

### 3. Integration Context Protocol
```typescript
interface IntegrationContext {
  external_systems: {
    n8n: {
      purpose: 'Workflow automation, communication orchestration';
      patterns: 'Event-driven triggers, multi-step processes';
      constraints: 'Rate limits, error handling, monitoring';
    };
    gmail_api: {
      purpose: 'Property manager communication processing';
      patterns: 'Webhook triggers, automated parsing, response generation';
      constraints: 'OAuth tokens, API quotas, spam filtering';
    };
    weather_apis: {
      purpose: 'Inspection scheduling optimization';
      patterns: 'Daily forecasts, severe weather alerts';
      constraints: 'Geographic coverage, update frequency, accuracy';
    };
    mapping_services: {
      purpose: 'Route optimization, property visualization';
      patterns: 'Geocoding, distance matrices, traffic data';
      constraints: 'API costs, rate limits, accuracy variations';
    };
  };
  
  data_flow_patterns: {
    supabase_central: 'Single source of truth for all property/inspection data';
    real_time_sync: 'WebSocket connections for live collaboration';
    offline_queue: 'Local storage with background sync capabilities';
    audit_trail: 'Immutable logs for compliance and debugging';
  };
}
```

### 4. Security Context Protocol
```typescript
interface SecurityContext {
  data_classification: {
    public: 'Marketing materials, general property info';
    internal: 'Inspection reports, client communications';
    confidential: 'Financial data, private property details';
    restricted: 'Authentication tokens, encryption keys';
  };
  
  access_patterns: {
    role_based: 'Super admin → Manager → Inspector permissions';
    property_isolation: 'RLS policies prevent cross-client data access';
    audit_logging: 'All sensitive operations logged with user context';
    session_management: 'Token rotation, device tracking, timeout policies';
  };
  
  compliance_requirements: {
    data_retention: 'Inspection records retained for 7 years';
    privacy_rights: 'GDPR/CCPA data deletion and portability';
    audit_trails: 'Complete operation history for regulatory review';
    encryption: 'TLS in transit, AES-256 at rest';
  };
}
```

### 5. Quality Assurance Context Protocol
```typescript
interface QualityContext {
  testing_strategies: {
    unit_testing: 'Individual component logic verification';
    integration_testing: 'Cross-system workflow validation';
    e2e_testing: 'Complete user journey automation';
    performance_testing: 'Load, stress, and scalability validation';
    security_testing: 'Vulnerability scanning and penetration testing';
  };
  
  quality_gates: {
    code_coverage: '>80% for critical business logic';
    performance_regression: 'No degradation >10% from baseline';
    security_scan: 'Zero critical vulnerabilities in production';
    accessibility: 'WCAG 2.1 AA compliance for inspector interface';
  };
  
  monitoring_metrics: {
    user_experience: 'Page load times, error rates, task completion';
    business_metrics: 'Campaign success rates, inspection accuracy';
    technical_metrics: 'API response times, database performance';
    operational_metrics: 'Uptime, deployment success, incident response';
  };
}
```

## Agent Coordination Context

### Cross-Agent Communication Protocol
```typescript
interface AgentCommunication {
  task_handoff: {
    format: 'Structured context transfer with validation checkpoints';
    timing: 'Real-time for critical paths, async for optimization tasks';
    validation: 'Receiving agent confirms understanding and capability';
    escalation: 'Automatic escalation to Meta Agent if handoff fails';
  };
  
  conflict_resolution: {
    resource_conflicts: 'Meta Agent arbitrates based on business priority';
    technical_conflicts: 'Expert agent takes lead with others supporting';
    timeline_conflicts: 'Automatic rescheduling with stakeholder notification';
  };
  
  knowledge_sharing: {
    patterns: 'Successful solutions shared across agent knowledge base';
    failures: 'Failure analysis shared to prevent repeated issues';
    optimizations: 'Performance improvements propagated to similar contexts';
  };
}
```

This reasoning framework ensures every agent operates with:
1. **Deep Domain Understanding** of RoofMind's business context
2. **Systematic Problem-Solving** approach with structured thinking
3. **Cross-Agent Coordination** for complex multi-step tasks
4. **Continuous Learning** from successes and failures
5. **Quality Focus** with built-in validation and testing